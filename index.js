require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const Person = require('./models/person');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('dist'));

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' });
};

const errorHandler = (error, request, response, next) => {
  console.error(error.message);

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' });
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message });
  }

  next(error);
};

morgan.token('body', (request) => JSON.stringify(request.body));
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms :body')
);

app.get('/info', (request, response) => {
  Person.countDocuments({}).then((count) => {
    const now = new Date().toUTCString();
    return response.send(
      `<div>Phonebook has info for ${count} people<br/>${now}</div>`
    );
  });
});

app.get('/api/people', (request, response) => {
  return Person.find({}).then((people) => {
    response.json(people);
  });
});

app.get('/api/people/:id', (request, response) => {
  Person.findById(request.params.id)
    .then((person) => {
      response.json(person);
    })
    .catch(() => {
      response.status(500).json({
        error: 'person does not exit',
      });
    });
});

app.post('/api/people', (request, response, next) => {
  const body = request.body;

  if (!body.name || !body.number) {
    return response.status(400).json({
      error: 'name and number are required fields',
    });
  }

  Person.findOne({ name: body.name }).then((result) => {
    if (result) {
      return response.status(400).json({
        error: `${body.name} does already exist`,
      });
    }

    Person.create({
      name: body.name,
      number: body.number,
    })
      .then((createdPerson) => {
        response.json(createdPerson);
      })
      .catch((error) => next(error));
  });
});

app.put('/api/people/:id', (request, response, next) => {
  const { name, number } = request.body;

  Person.findByIdAndUpdate(
    request.params.id,
    // New person
    {
      name,
      number,
    },
    // Options
    {
      new: true,
      runValidators: true,
      context: 'query',
    }
  )
    .then((updatedPerson) => {
      response.json(updatedPerson);
    })
    .catch((error) => next(error));
});

app.delete('/api/people/:id', (request, response, next) => {
  Person.findByIdAndDelete(request.params.id)
    .then(() => {
      response.status(204).end();
    })
    .catch((error) => next(error));
});

app.use(unknownEndpoint);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 express app listening on port ${PORT}`);
});
