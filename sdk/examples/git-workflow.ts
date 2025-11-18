/**
 * Git Workflow Example
 *
 * Demonstrates git operations: clone, modify, commit, push
 */

import { VibeBox } from '../src';

async function main() {
  const vb = new VibeBox();

  // Use context manager for auto-cleanup
  await vb.withSandbox('node-20', async (sandbox) => {
    console.log('Cloning repository...');
    await sandbox.git.clone('https://github.com/user/demo-repo.git', {
      branch: 'main',
      path: '/workspace/repo',
    });

    console.log('\nGit status:');
    const status = await sandbox.git.status();
    console.log(`Branch: ${status.branch}`);
    console.log(`Modified: ${status.modified.length} files`);

    console.log('\nMaking changes...');
    await sandbox.files.upload(
      '/workspace/repo/README.md',
      '# Updated README\n\nThis was updated via VibeBox SDK!'
    );

    console.log('\nCommitting changes...');
    await sandbox.git.commit('Update README via SDK', {
      all: true,
      author: {
        name: 'VibeBox SDK',
        email: 'sdk@vibebox.dev',
      },
    });

    console.log('\nPushing changes...');
    await sandbox.git.push();

    console.log('\nGit workflow complete!');
  });
}

main().catch(console.error);
