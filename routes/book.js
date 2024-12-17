const { query, body, validationResult, param } = require('express-validator');
var express = require('express');
const db = require('../db');
var router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) 
      return res.status(400).json({ errors: errors.array() });
  
  next();
};

router.get('/list', async (req, res)=>{
  try {
    const result = await db.query('SELECT id, title, author FROM Book');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

/* Delete a specific book */
validateBookId = [
  param('id').isInt().withMessage('ID must be an integer')
]
router.delete('/:id', validateBookId, validate,  async (req, res) => {
  const bookId = req.params.id;
  console.log(`Deleting book with id ${bookId}`);
  try {
    const result = await db.query("DELETE FROM Book WHERE id = $1 RETURNING *", [bookId]);
    if (result.rowCount === 0) {
      res.status(404).send('Book not found');
    } else {
      res.json({ message: 'Book deleted successfully', book: result.rows[0] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

const validateBookBody = [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('isbn').isISBN().withMessage('ISBN is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('shelf_location').notEmpty().withMessage('Shelf location is required')
];
/* Add a new book */
router.post('/', validateBookBody, validate, async (req, res) => {
  const { title, author, isbn, quantity, shelf_location } = req.body;

  try {

    const result = await db.query(
      'INSERT INTO Book (title, author, isbn, quantity, shelf_location) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, author, isbn, quantity, shelf_location]
    );
    res.status(201).json({ message: 'Book added successfully', book: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});


/* Update an existing book */
const validateUpdateParams = [
  param('id').isInt().withMessage('Book ID must be a valid integer'), 
  body('title').optional().isString().withMessage('Title must be a string'),
  body('author').optional().isString().withMessage('Author must be a string'),
  body('isbn').isISBN().optional().withMessage('ISBN must be a valid ISBN'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('shelf_location').optional().isString().withMessage('Shelf location must be a string'),
  
  (req, res, next) => {
    const { title, author, isbn, quantity, shelf_location } = req.body;
    if (!title && !author && !isbn && quantity === undefined && !shelf_location) {
      return res.status(400).send('At least one field (title, author, isbn, quantity, shelf_location) must be provided for update.');
    }
    next();
  }
];
router.put('/:id',validateUpdateParams, async (req, res) => {
  const bookId = req.params.id;
  const { title, author, isbn, quantity, shelf_location } = req.body;

  try {
    // Construct the dynamic update query
    const fields = [];
    const values = [];
    let index = 1;

    if (title) {
      fields.push(`title = $${index++}`);
      values.push(title);
    }
    if (author) {
      fields.push(`author = $${index++}`);
      values.push(author);
    }
    if (isbn) {
      fields.push(`isbn = $${index++}`);
      values.push(isbn);
    }
    if (quantity !== undefined) {
      if (quantity < 0) {
        throw new Error('Quantity cannot be negative');
      }
      
      fields.push(`quantity = $${index++}`);
      values.push(quantity);
    }
    if (shelf_location) {
      fields.push(`shelf_location = $${index++}`);
      values.push(shelf_location);
    }

    values.push(bookId); // Add the book ID as the last parameter

    const query = `UPDATE Book SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).send('Book not found');
    }

    res.json({ message: 'Book updated successfully', book: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


/* Search for books by title, author, or ISBN */
const validateSearchParams = [
  query('title').optional().isString().withMessage('Title must be a string'),
  query('author').optional().isString().withMessage('Author must be a string'),
  query('isbn').optional().isString().withMessage('ISBN must be a string'),
  // Custom validator to ensure at least one of the parameters is provided
  (req, res, next) => {
    if (!req.query.title && !req.query.author && !req.query.isbn) {
      return res.status(400).send('At least one query parameter (title, author, or ISBN) must be provided for searching.');
    }
    next();
  }
];
router.get('/search',validateSearchParams, async (req, res) => {
  const { title, author, isbn } = req.query;


  try {
    const conditions = [];
    const values = [];
    let index = 1;

    // Add conditions dynamically based on query parameters
    if (title) {
      conditions.push(`title ILIKE $${index++}`);
      values.push(`%${title}%`);
    }
    if (author) {
      conditions.push(`author ILIKE $${index++}`);
      values.push(`%${author}%`);
    }
    if (isbn) {
      conditions.push(`isbn = $${index++}`);
      values.push(isbn);
    }

    // Construct the SQL query
    const query = `
      SELECT id, title, author, isbn, quantity, shelf_location 
      FROM Book 
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).send('No books found matching the criteria.');
    }

    res.json({ books: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


module.exports = router;
