const express = require("express");
const multer = require("multer");
const fs = require("fs");

let books = require("./books.json");
const {
  getImageName,
  getId,
  getUpdatedBooks,
  parseBookObject,
} = require("./utils/utils");
const { deleteImage } = require("./utils/utils_images");
const errorsMiddleware = require("./errors/errorsMiddleware");

const port = 3000;
const server = express();

// config of the diskStorageOptions
const storage = multer.diskStorage({
  destination: "./images/",
  filename: function ({ body: { title } }, { mimetype }, cb) {
    cb(null, getImageName(title, mimetype));
  },
});

// instantiate the multer middleware with the diskStorageOptions
const upload = multer({ storage: storage });

server.get("/", (req, res) => {
  res.send(books);
});

server.get("/book/:id", ({ params: { id } }, res, next) => {
  try {
    const book = books.find((book) => String(book.id) === id);
    if (book === undefined) throw new Error("This book does not exist ");
    res.send(book);
  } catch (error) {
    next(error);
  }
});

/* 
multer is parsing the multiforms and store the contentin the body of the request.
without it the body is undefined 
the data from a multipart are sent as a Stream and multer is listening to this stream through busboy   
*/

server.post(
  "/",
  upload.single("image"),
  ({ body, file: { path } }, res, next) => {
    books = getUpdatedBooks();
    body.imageLink = path;
    body.pages = Number.parseInt(body.pages);
    body.year = Number.parseInt(body.year);
    body.id = getId();

    newList = [...books, body];
    try {
      fs.writeFile("./books.json", JSON.stringify(newList), () => {
        console.log(`${body.title} added to the list !`);
        res.json(body);
      });
    } catch (error) {
      next(error);
    }
  }
);

server.delete("/book/:id", ({ params: { id } }, res) => {
  try {
    books = getUpdatedBooks();
    //TODO: look at this part that looks useless
    const indexToRemove = books.findIndex(
      (book) => book.id === Number.parseInt(id)
    );

    if (indexToRemove === -1) throw new Error("Error: this book was not found");

    books.splice(indexToRemove, 1);
    fs.writeFile("./books.json", JSON.stringify(books), () => {
      console.log("books was rewrited");
      res.json(books);
    });
  } catch (error) {
    next(error);
  }
});

server.patch(
  "/book/:id",
  upload.single("image"),
  ({ params: { id }, body, file }, res) => {
    try {
      const books = getUpdatedBooks();

      let updatedBook = {};
      const indexToUpdate = books.findIndex(
        (book) => book.id === Number.parseInt(id)
      );

      if (indexToUpdate === -1)
        throw new Error("Error: this book was not found");

      updatedBook = {
        ...Object.fromEntries(
          Object.entries(body).filter(([key, value]) => value !== "")
        ),
      };

      if (file) {
        updatedBook.imageLink = file.path;
        updatedBook.title !== books[indexToUpdate].title &&
          deleteImage(books[indexToUpdate].imageLink);
      }

      updatedBook = {
        ...books[indexToUpdate],
        ...updatedBook,
      };

      updatedBook = parseBookObject(updatedBook);

      books[indexToUpdate] = updatedBook;
      fs.writeFile("./books.json", JSON.stringify(books), () => {
        console.log("books was rewrited");
        res.json(updatedBook);
      });
    } catch (error) {
      next(error);
    }
  }
);

server.use(errorsMiddleware);

server.listen(port, () => {
  console.log(`server is listening on port : ${port}`);
});
