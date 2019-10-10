'use strict';

class AppError {

  constructor(code, msg) { this.code = code; this.msg = msg; }

  toString() { return `${this.code}: ${this.msg}`; }
}

module.exports = AppError;
