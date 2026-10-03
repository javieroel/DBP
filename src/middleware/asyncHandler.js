// Express 4 no atrapa solo los errores de funciones async.
// Este envoltorio hace: si la promesa falla -> next(error) -> errorHandler central.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
