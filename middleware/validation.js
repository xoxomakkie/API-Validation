const jsonschema = require("jsonschema");
const ExpressError = require("../expressError");

/**
 * Middleware to validate request body against a JSON schema
 */
function validateJSON(schema) {
  return function(req, res, next) {
    const result = jsonschema.validate(req.body, schema);
    
    if (!result.valid) {
      // Collect all error messages
      const listOfErrors = result.errors.map(error => error.stack);
      const error = new ExpressError(listOfErrors, 400);
      return next(error);
    }
    
    return next();
  };
}

module.exports = { validateJSON };
