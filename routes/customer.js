var express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
var router = express.Router();

/* List all customers */
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT id, name, email, createdAt FROM Customer ORDER BY id ASC';
    const result = await db.query(query);

    res.json({ customers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

/* Register a new customer */
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Email must be valid.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;
    const registeredDate = new Date(); // Use current date as default

    // Input validation
    if (!name || !email) {
      return res.status(400).send('Name and email are required.');
    }

    try {
      const result = await db.query(
        `INSERT INTO Customer (name, email, createdAt) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [name, email, registeredDate]
      );

      res.status(201).json({ message: 'Customer registered successfully', customer: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  }
);

/* Update customer details */
router.put(
  '/:id',
  [
    param('id').isInt().withMessage('Customer ID must be an integer.'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty.'),
    body('email').optional().isEmail().withMessage('Email must be valid.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customerId = req.params.id; // Get the customer ID from the URL
    const { name, email } = req.body;

    // Validate that at least one field is provided
    if (!name && !email) {
      return res.status(400).send('At least one field (name or email) must be provided for update.');
    }

    try {
      const fields = [];
      const values = [];
      let index = 1;

      // Dynamically build the update query
      if (name) {
        fields.push(`name = $${index++}`);
        values.push(name);
      }
      if (email) {
        fields.push(`email = $${index++}`);
        values.push(email);
      }

      values.push(customerId); // Add customerId for the WHERE clause

      const query = `
        UPDATE Customer 
        SET ${fields.join(', ')} 
        WHERE id = $${index} 
        RETURNING *`;

      const result = await db.query(query, values);

      // Check if the customer exists
      if (result.rowCount === 0) {
        return res.status(404).send('Customer not found');
      }

      res.json({ message: 'Customer updated successfully', customer: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  }
);

/* Delete a specific customer */
router.delete(
  '/:id',
  [param('id').isInt().withMessage('Customer ID must be an integer.')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customerId = req.params.id; // Extract the customer ID from the URL parameter

    try {
      // Perform the deletion
      const result = await db.query('DELETE FROM Customer WHERE id = $1 RETURNING *', [customerId]);

      // Check if the customer existed and was deleted
      if (result.rowCount === 0) {
        return res.status(404).send('Customer not found');
      }

      res.json({ message: 'Customer deleted successfully', customer: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  }
);

module.exports = router;
