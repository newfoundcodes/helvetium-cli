export default {
  name: 'hello',
  description: 'Example project-local command',

  async run(context) {
    context.io.write(`Hello from ${context.projectRoot ?? context.cwd}`);
    return 0;
  },
};
