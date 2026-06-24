import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { AppData, Task, Project, Note, PlannerEvent } from '@/lib/types';

// Tüm uygulama durumu Postgres'te 4 tabloda tutulur (bkz. prisma/schema.prisma).
// GET: tabloları okuyup AppData olarak birleştirir.
// PUT: gelen tüm durumu tek transaction'da senkronlar (temizle + yaz).
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [tasks, projects, notes, plannerEvents] = await Promise.all([
      prisma.task.findMany(),
      prisma.project.findMany(),
      prisma.note.findMany(),
      prisma.plannerEvent.findMany(),
    ]);
    const data: AppData = {
      tasks: tasks as unknown as Task[],
      projects: projects as unknown as Project[],
      notes: notes as unknown as Note[],
      plannerEvents: plannerEvents as unknown as PlannerEvent[],
    };
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Okuma hatası', detail: String(err) },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  let body: AppData;
  try {
    body = (await req.json()) as AppData;
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  try {
    // Küçük bir kişisel veri kümesi: tüm durumu temizleyip yeniden yazmak en basit
    // ve tutarlı yöntem. Transaction sayesinde ya hepsi yazılır ya hiçbiri.
    await prisma.$transaction([
      prisma.task.deleteMany(),
      prisma.project.deleteMany(),
      prisma.note.deleteMany(),
      prisma.plannerEvent.deleteMany(),
      prisma.task.createMany({ data: body.tasks.map(toTaskRow) as unknown as Prisma.TaskCreateManyInput[] }),
      prisma.project.createMany({ data: body.projects.map(toProjectRow) as unknown as Prisma.ProjectCreateManyInput[] }),
      prisma.note.createMany({ data: body.notes.map(toNoteRow) as unknown as Prisma.NoteCreateManyInput[] }),
      prisma.plannerEvent.createMany({ data: body.plannerEvents.map(toPlannerRow) as unknown as Prisma.PlannerEventCreateManyInput[] }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'Yazma hatası', detail: String(err) },
      { status: 500 },
    );
  }
}

// --- Tip -> satır eşlemeleri (json alanlar için varsayılan boş dizi) ---

function toTaskRow(t: Task) {
  return {
    ...t,
    tags: t.tags ?? [],
    problemSolutions: t.problemSolutions ?? [],
  };
}

function toProjectRow(p: Project) {
  return {
    ...p,
    implementationChecklist: p.implementationChecklist ?? [],
    bugLog: p.bugLog ?? [],
    closureChecklist: p.closureChecklist ?? [],
  };
}

function toNoteRow(n: Note) {
  return {
    ...n,
    blocks: n.blocks ?? [],
    tags: n.tags ?? [],
  };
}

function toPlannerRow(e: PlannerEvent) {
  return { ...e };
}
