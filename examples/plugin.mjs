export default {
  name: 'example-plugin',
  register(registry) {
    registry.command({
      name: 'example:plugin',
      description: 'Command registered by a plugin',
      run(context) {
        context.io.write('Plugin command executed');
      },
    });
  },
};
