/** Configuration Jest (ts-jest) pour les tests unitaires/intégration légers du projet. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  clearMocks: true,
};
