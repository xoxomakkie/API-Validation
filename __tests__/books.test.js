process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require("../db");
const Book = require("../models/book");

// Sample book data
const book1 = {
  isbn: "0691161518",
  amazon_url: "http://a.co/eobPtX2",
  author: "Matthew Lane",
  language: "english",
  pages: 264,
  publisher: "Princeton University Press",
  title: "Power-Up: Unlocking the Hidden Mathematics in Video Games",
  year: 2017
};

const book2 = {
  isbn: "0374533557",
  amazon_url: "http://a.co/example",
  author: "Ursula K. Le Guin",
  language: "english", 
  pages: 195,
  publisher: "Farrar, Straus and Giroux",
  title: "The Left Hand of Darkness",
  year: 1969
};

describe("Books Routes", () => {
  // Clean up database before each test
  beforeEach(async () => {
    await db.query("DELETE FROM books");
  });

  // Clean up and close connection after all tests
  afterAll(async () => {
    await db.query("DELETE FROM books");
    await db.end();
  });

  describe("GET /books", () => {
    test("Gets a list of all books", async () => {
      // Add test books
      await Book.create(book1);
      await Book.create(book2);

      const response = await request(app).get("/books");
      
      expect(response.statusCode).toBe(200);
      expect(response.body.books).toHaveLength(2);
      expect(response.body.books[0]).toHaveProperty("isbn");
      expect(response.body.books[0]).toHaveProperty("title");
    });

    test("Returns empty array when no books", async () => {
      const response = await request(app).get("/books");
      
      expect(response.statusCode).toBe(200);
      expect(response.body.books).toHaveLength(0);
    });
  });

  describe("GET /books/:isbn", () => {
    test("Gets a single book by ISBN", async () => {
      await Book.create(book1);

      const response = await request(app).get(`/books/${book1.isbn}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.book).toEqual(book1);
    });

    test("Responds with 404 if book not found", async () => {
      const response = await request(app).get("/books/nonexistent");
      
      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /books", () => {
    test("Creates a new book", async () => {
      const response = await request(app)
        .post("/books")
        .send(book1);
      
      expect(response.statusCode).toBe(201);
      expect(response.body.book).toEqual(book1);
    });

    test("Prevents creating book without required fields", async () => {
      const incompleteBook = {
        isbn: "123456789",
        title: "Incomplete Book"
        // Missing required fields
      };

      const response = await request(app)
        .post("/books")
        .send(incompleteBook);
      
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBeInstanceOf(Array);
    });

    test("Prevents creating book with invalid data types", async () => {
      const invalidBook = {
        ...book1,
        pages: "not a number",
        year: "not a number"
      };

      const response = await request(app)
        .post("/books")
        .send(invalidBook);
      
      expect(response.statusCode).toBe(400);
    });

    test("Prevents creating book with invalid year", async () => {
      const invalidBook = {
        ...book1,
        year: 500  // Too old
      };

      const response = await request(app)
        .post("/books")
        .send(invalidBook);
      
      expect(response.statusCode).toBe(400);
    });

    test("Prevents creating book with invalid URL", async () => {
      const invalidBook = {
        ...book1,
        amazon_url: "not-a-url"
      };

      const response = await request(app)
        .post("/books")
        .send(invalidBook);
      
      expect(response.statusCode).toBe(400);
    });

    test("Prevents creating book with extra properties", async () => {
      const bookWithExtra = {
        ...book1,
        extraProperty: "should not be allowed"
      };

      const response = await request(app)
        .post("/books")
        .send(bookWithExtra);
      
      expect(response.statusCode).toBe(400);
    });

    test("Prevents creating book with negative pages", async () => {
      const invalidBook = {
        ...book1,
        pages: -10
      };

      const response = await request(app)
        .post("/books")
        .send(invalidBook);
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe("PUT /books/:isbn", () => {
    test("Updates a book", async () => {
      await Book.create(book1);
      
      const updateData = {
        author: "Updated Author",
        title: "Updated Title",
        year: 2020,
        pages: 300,
        language: "spanish",
        publisher: "Updated Publisher"
      };

      const response = await request(app)
        .put(`/books/${book1.isbn}`)
        .send(updateData);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.book.author).toBe("Updated Author");
      expect(response.body.book.title).toBe("Updated Title");
      expect(response.body.book.isbn).toBe(book1.isbn); // ISBN should remain unchanged
    });

    test("Updates book with partial data", async () => {
      await Book.create(book1);
      
      const updateData = {
        author: "New Author Only"
      };

      const response = await request(app)
        .put(`/books/${book1.isbn}`)
        .send(updateData);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.book.author).toBe("New Author Only");
      // Other fields should remain unchanged
      expect(response.body.book.title).toBe(book1.title);
    });

    test("Responds with 404 if book not found", async () => {
      const response = await request(app)
        .put("/books/nonexistent")
        .send({ author: "New Author" });
      
      expect(response.statusCode).toBe(404);
    });

    test("Prevents update with invalid data types", async () => {
      await Book.create(book1);
      
      const invalidUpdate = {
        pages: "not a number"
      };

      const response = await request(app)
        .put(`/books/${book1.isbn}`)
        .send(invalidUpdate);
      
      expect(response.statusCode).toBe(400);
    });

    test("Prevents update with empty request body", async () => {
      await Book.create(book1);

      const response = await request(app)
        .put(`/books/${book1.isbn}`)
        .send({});
      
      expect(response.statusCode).toBe(400);
    });

    test("Prevents update with extra properties", async () => {
      await Book.create(book1);
      
      const invalidUpdate = {
        author: "Valid Author",
        invalidProperty: "should not be allowed"
      };

      const response = await request(app)
        .put(`/books/${book1.isbn}`)
        .send(invalidUpdate);
      
      expect(response.statusCode).toBe(400);
    });
  });

  describe("DELETE /books/:isbn", () => {
    test("Deletes a book", async () => {
      await Book.create(book1);

      const response = await request(app).delete(`/books/${book1.isbn}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: "Book deleted" });
    });

    test("Responds with 404 if book not found", async () => {
      const response = await request(app).delete("/books/nonexistent");
      
      expect(response.statusCode).toBe(404);
    });

    test("Book is actually deleted from database", async () => {
      await Book.create(book1);
      await request(app).delete(`/books/${book1.isbn}`);

      // Try to get the deleted book
      const response = await request(app).get(`/books/${book1.isbn}`);
      expect(response.statusCode).toBe(404);
    });
  });
});
