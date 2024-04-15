module.exports = {
   extends: ['@commitlint/config-conventional'],
   rules: {
      'scope-enum': async ctx =>
        [2, 'always', ["deps", "configurations", "helm", "backend", "client", "common", "frontend"]],
          "scope-empty": [2, "never"],
   }
};
