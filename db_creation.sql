
CREATE TABLE IF NOT EXISTS Book (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    ISBN VARCHAR(20) UNIQUE NOT NULL,
    quantity INT NOT NULL CHECK (quantity >= 0),
    shelf_location VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS Customer (
  	id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS Borrow (
    user_id INT NOT NULL REFERENCES Customer(id) ON DELETE CASCADE,
    book_id INT NOT NULL REFERENCES Book(id) ON DELETE CASCADE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dueReturnAt TIMESTAMP NOT NULL,
    returnedAt TIMESTAMP,
	PRIMARY KEY (book_id, user_id)
);

CREATE INDEX idx_books_title ON Book(title);
CREATE INDEX idx_books_author ON Book(author);
CREATE INDEX idx_books_ISBN ON Book(ISBN);
CREATE INDEX idx_borrow_user_id ON Borrow(user_id);
CREATE INDEX idx_borrow_book_id ON Borrow(book_id);


insert into Book values (DEFAULT, 'The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 5, 'A1');
insert into Book values (DEFAULT, 'To Kill a Mockingbird', 'Harper Lee', '9780061120084', 3, 'A2');
insert into Book values (DEFAULT, '1984', 'George Orwell', '9780451524935', 2, 'A3');

INSERT INTO Customer VALUES (DEFAULT, 'John Doe', 'john-doe@email.com', CURRENT_DATE);
INSERT INTO Customer VALUES (DEFAULT, 'Kayley Smith', 'kayley-smith@email.com', CURRENT_DATE);

insert into Borrow values(1, 1, CURRENT_DATE, CURRENT_DATE + 14, NULL);
insert into Borrow values(2, 1, CURRENT_DATE, CURRENT_DATE + 13, NULL);
insert into Borrow values(1, 2, CURRENT_DATE, CURRENT_DATE + 10, NULL);


select * from Book;
select * from Customer;
select * from Borrow;

-- drop Table book, customer, borrow

