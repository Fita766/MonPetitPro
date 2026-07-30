import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const adminSource = readFileSync(resolve(process.cwd(), 'src/pages/AdminUsers.tsx'), 'utf8');
const loginSource = readFileSync(resolve(process.cwd(), 'src/pages/Login.tsx'), 'utf8');
const accessControlSource = readFileSync(resolve(process.cwd(), 'src/lib/accessControl.ts'), 'utf8');

function tsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? tsxFiles(path) : path.endsWith('.tsx') ? [path] : [];
  });
}

describe('administration simplifiée', () => {
  it('crée les comptes directement sans invitation par e-mail', () => {
    expect(adminSource).toContain("action: 'create'");
    expect(adminSource).not.toContain("mode: 'invite'");
    expect(adminSource).not.toContain('inviteUserByEmail');
    expect(adminSource).not.toContain('Envoyer l’invitation');
    expect(loginSource).not.toContain('créés ou invités');
    expect(accessControlSource).not.toContain('Créer et inviter des utilisateurs');
    expect(loginSource).toContain('mot de passe temporaire');
  });

  it('ne propose plus le transfert déjà terminé du compte démo', () => {
    expect(adminSource).not.toContain('transfer-demo');
    expect(adminSource).not.toContain('Sécuriser la démo');
    expect(accessControlSource).not.toContain('admin.demo_transfer');
    expect(adminSource).not.toContain('confirmTransfer');
  });

  it('permet de dupliquer un rôle avant de personnaliser ses droits', () => {
    expect(adminSource).toContain('Dupliquer ce rôle');
    expect(adminSource).toContain("is_system: false");
  });

  it('n’utilise aucune graisse typographique supérieure à 600', () => {
    const offenders = tsxFiles(resolve(process.cwd(), 'src'))
      .filter((path) => /font-(?:black|extrabold|bold)\b/.test(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
