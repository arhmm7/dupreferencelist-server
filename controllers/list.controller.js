import fs from 'fs/promises';
import OpenAI from 'openai';
import { initDB } from '../database/db.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getValidCourseCombos(data, preferredCourses) {
  const combos = [];

  data.forEach(({ college, courses }) => {
    if (!Array.isArray(courses)) return;

    courses.forEach(course => {
      if (!course) return;

      const isPreferredCourse = preferredCourses.some(pref =>
        course.toLowerCase().includes(pref.toLowerCase())
      );

      if (isPreferredCourse) {
        combos.push({ college, course });
      }
    });
  });

  return combos;
}

function formatCombosList(combos) {
  return combos.map(({ college, course }) => `${college} - ${course}`).join('\n');
}

export const generatePreferenceList = async (req, res) => {
  const { preferredCourses, preferredColleges, razorpay_order_id } = req.body;

  if (!razorpay_order_id) {
    return res.status(400).json({ message: "razorpay_order_id is required" });
  }

  if (!preferredCourses || !Array.isArray(preferredCourses)) {
  return res.status(400).json({ message: "preferredCourses must be an array" });
  }

  if (preferredCourses.length > 5) {
    return res.status(400).json({ message: "You can select up to 5 courses only" });
  }


  try {
    const db = await initDB();

    const order = await db.get(
      'SELECT * FROM orders WHERE razorpay_order_id = ? AND status = "paid"',
      [razorpay_order_id]
    );

    if (!order) {
      return res.status(403).json({ message: "Payment not completed for this order" });
    }

    const rawData = await fs.readFile('./output.json', 'utf-8');
    const data = JSON.parse(rawData);

    const validCombos = getValidCourseCombos(data, preferredCourses);
    const formattedCombos = formatCombosList(validCombos);

    const collegeNote = Array.isArray(preferredColleges) && preferredColleges.length > 0
      ? `Try to prefer the following colleges if possible: ${preferredColleges.join(', ')}.`
      : "";

 const prompt = `
  You are a DU college counsellor.
  Your job is to help create the best possible preference list for a student.

  Only respond with valid JSON. Do not include any explanations, notes, or additional text — just the JSON array.

  Here are all the valid combinations — only use these, do not invent any:
  ${formattedCombos}

  Make sure to include all the preferred courses in the list to keep it diverse:
  ${preferredCourses}

  Here are the colleges the student prefers — prioritize them slightly:
  ${collegeNote}

  Rank the combinations based on how desirable and reputed they are to a typical DU applicant.
  Consider placements, reputation, location (like North Campus), etc.
  Return only the **top 30 combinations** in descending preference order.

  Respond ONLY as a JSON array:
  [
    { "rank": "1", "college": "Hansraj College", "course": "B.Sc. (Hons.) Computer Science" },
    ...
  ]
  `;


    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const resultText = response.choices[0].message.content;

    try {
      const resultJSON = JSON.parse(resultText);

      await db.run(
        'UPDATE orders SET preference_list = ? WHERE razorpay_order_id = ?',
        [JSON.stringify(resultJSON), razorpay_order_id]
      );

      return res.status(200).json({ list: resultJSON });
    } catch (err) {
      return res.status(500).json({
        message: "Failed to parse AI response",
        raw: resultText,
      });
    }

  } catch (err) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const getUserLists = async (req, res) => {
  const userId = req.user.id;

  try {
    const db = await initDB();

    const orders = await db.all(
      `SELECT id, razorpay_order_id, preference_list, created_at
       FROM orders
       WHERE user_id = ? AND status = "paid" AND preference_list IS NOT NULL
       ORDER BY datetime(created_at) DESC`,
      [userId]
    );

    const result = orders.map(order => ({
      id: order.id,
      razorpay_order_id: order.razorpay_order_id,
      created_at: order.created_at,
      preference_list: JSON.parse(order.preference_list)
    }));

    res.json(result);
  } catch (error) {
    console.error("Failed to fetch lists:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
