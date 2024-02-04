module.exports = {
   extends: ['@commitlint/config-conventional'],
   rules: {
      'scope-enum': async ctx =>
        [2, 'always', ["deps", "configurations", "helm", "backend", "client", "common"]],
          "scope-empty": [2, "never"],
   }
};
