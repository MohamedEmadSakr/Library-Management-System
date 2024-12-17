var express = require("express");
const { body, param, validationResult } = require("express-validator");
const db = require("../db");
var router = express.Router();

async function getUser(user_id) {
  if (!user_id) return false;

  const result = await db.query("SELECT * FROM Customer WHERE id = $1", [
    user_id,
  ]);
  if (result.rowCount === 0) return false;
  return result;
}

async function getBook(book_id) {
  if (!book_id) return false;

  const result = await db.query("SELECT * FROM Book WHERE id = $1", [book_id]);
  if (result.rowCount === 0) return false;

  return result;
}

/* Endpoint 1: Borrow a Book */
router.post(
  "/",
  [
    body("book_id").isInt().withMessage("Book ID must be an integer."),
    body("user_id").isInt().withMessage("User ID must be an integer."),
    body("dueReturnAt").custom((dueReturnAt, { req }) => {
      if (new Date(dueReturnAt) <= new Date()) {
        throw new Error("Due return date must be in the future.");
      }
      return true;
    })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { book_id, user_id, dueReturnAt } = req.body;

    if (!book_id || !user_id || !dueReturnAt) {
      return res.status(400).send("Book ID, User ID, and Due Date are required.");
    }

    try {
      // Check if the book exists and has available quantity
      const bookResult = await db.query(
        "SELECT quantity FROM Book WHERE id = $1",
        [book_id]
      );

      if (bookResult.rowCount === 0) {
        return res.status(404).send("Book not found.");
      }

      if (bookResult.rows[0].quantity <= 0) {
        return res.status(400).send("Book is not available for borrowing.");
      }

      // check that the user exists
      // const userResult = await db.query("SELECT * FROM Customer WHERE id = $1", [
      //   user_id,
      // ]);
      // if (userResult.rowCount === 0) {
      //   return res.status(404).send("User not found.");
      // }

      // check dueReturnDate is in the future
      if (new Date(dueReturnAt) <= new Date()) {
        return res.status(400).send("Due return date must be in the future.");
      }
  
      try {
        await db.query("BEGIN");

        // Insert into Borrow table
        await db.query(
          `INSERT INTO Borrow (book_id, user_id, createdAt, dueReturnAt, returnedAt) 
        VALUES ($1, $2, CURRENT_DATE, $3, NULL)`,
          [book_id, user_id, dueReturnAt]
        );

        // Decrease the book's quantity
        await db.query("UPDATE Book SET quantity = quantity - 1 WHERE id = $1", [
          book_id,
        ]);

        await db.query("COMMIT");

        res.status(201).send("Book borrowed successfully.");
      } catch (err) {
        db.query("ROLLBACK");
        console.error(err);
        res.status(500).send(err.message);
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

/* Endpoint 2: Return a Book */
router.put(
  "/return/:user_id/:book_id",
  [
    param("user_id").isInt().withMessage("User ID must be an integer."),
    param("book_id").isInt().withMessage("Book ID must be an integer."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user_id = req.params.user_id;
    const book_id = req.params.book_id;

    try {
      db.query("BEGIN");
      // Mark the book as returned
      const result = await db.query(
        `UPDATE Borrow 
        SET returnedAt = CURRENT_DATE 
        WHERE user_id = $1 AND book_id = $2 AND returnedAt IS NULL 
        RETURNING book_id`,
        [user_id, book_id]
      );

      if (result.rowCount === 0) {
        return res
          .status(404)
          .send("Borrow record not found or book already returned.");
      }

      // Increase the book's quantity
      const bookId = result.rows[0].book_id;
      const bookResult = await db.query(
        "UPDATE Book SET quantity = quantity + 1 WHERE id = $1",
        [bookId]
      );

      if (bookResult.rowCount === 0) {
        throw new Error("Book not found.");
      }

      db.query("COMMIT");
      res.send("Book returned successfully.");
    } catch (err) {
      db.query("ROLLBACK");
      console.error(err);
      res.status(500).send(err.message);
    }
  }
);

/* Endpoint 3: List Books Borrowed by a Customer */
router.get(
  "/borrowed/:user_id",
  [param("user_id").isInt().withMessage("User ID must be an integer.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.user_id;
    console.log("brrowed by user id", userId);
    try {
      const result = await db.query(
        `SELECT bk.title, bk.author, br.createdAt, br.dueReturnAt 
        FROM Borrow br 
        JOIN Book bk ON br.book_id = bk.id
        WHERE br.user_id = $1 AND br.returnedAt IS NULL`,
        [userId]
      );

      res.json({ borrowed_books: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

/* Endpoint 4: List Overdue Books */
router.get("/overdue", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT bk.title, bk.author, br.dueReturnAt, c.name AS borrower_name
      FROM Borrow br
      JOIN Book bk ON br.book_id = bk.id
      JOIN Customer c ON br.user_id = c.id
      WHERE br.dueReturnAt < CURRENT_DATE AND br.returnedAt IS NULL`
    );

    res.json({ overdue_books: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
