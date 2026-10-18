export default {
  commands: [
    {
      name: 'app:hello',
      description: 'Application custom command',
      run(context) {
        context.io.write('Hello application');
      },
    },
  ],
  plugins: ['./tools/cli-plugin.mjs'],
};
