'use strict';

module.exports = app => {
  app.get('/index', 'home');
  app.get('/foo', 'foo');
};
