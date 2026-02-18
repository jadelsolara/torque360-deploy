'use client';

import { useEffect } from 'react';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface BugPayload {
  id: string;
  ts: string;
  project: string;
  section: string;
  user: string;
  severity: string;
  desc: string;
  errors: unknown[] | null;
  ua: string;
  viewport: string;
  lang: string;
  sent: boolean;
}

async function postBug(bug: BugPayload): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API_URL}/bugs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        description: bug.desc,
        severity: bug.severity,
        section: bug.section,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        viewport: bug.viewport,
        userAgent: bug.ua,
        browserLang: bug.lang,
        jsErrors: bug.errors,
        userLabel: bug.user,
        project: bug.project,
      }),
    });
    return res.ok || res.status === 409; // 409 = duplicate, still counts as "sent"
  } catch {
    return false;
  }
}

/**
 * Bridges the vanilla JS bug reporter widget with the authenticated API.
 * Sets window.GENIE_BUG_CONFIG.onSend to POST bugs to /api/bugs.
 * Falls back to clipboard (default widget behavior) if not authenticated.
 */
export default function BugReporterBridge() {
  useEffect(() => {
    const cfg = (window as Record<string, unknown>).GENIE_BUG_CONFIG as
      | Record<string, unknown>
      | undefined;
    if (!cfg) return;

    cfg.onSend = async (_text: string, bugOrBugs: BugPayload | BugPayload[]) => {
      const bugs = Array.isArray(bugOrBugs) ? bugOrBugs : [bugOrBugs];

      for (const bug of bugs) {
        await postBug(bug);
      }
    };
  }, []);

  return null;
}
