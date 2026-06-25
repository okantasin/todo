import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { AppData, Task, Project, Note, PlannerEvent } from '@/lib/types';

// Tüm uygulama durumu Postgres'te 4 tabloda tutulur (bkz. prisma/schema.prisma).
// GET: tabloları okuyup AppData olarak birleştirir.
// PUT: gelen durumu UPSERT ile senkronlar. Var olan kayıt YERİNDE güncellenir
//      (silinip yeniden yazılmaz); yalnızca gelen veride artık olmayan kayıt
//      (yani kullanıcı UI'dan sildiyse) silinir.
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
    const taskRows = body.tasks.map(toTaskRow);
    const projectRows = body.projects.map(toProjectRow);
    const noteRows = body.notes.map(toNoteRow);
    const plannerRows = body.plannerEvents.map(toPlannerRow);

    const ops: Prisma.PrismaPromise<unknown>[] = [];

    // 1) Yalnızca artık gelmeyen (UI'dan silinmiş) kayıtları sil.
    //    notIn: [] → Prisma bunu "hepsi" olarak yorumlar; yani liste boşsa
    //    (kullanıcı son kaydı da sildiyse) o tablodaki tüm satırlar silinir.
    ops.push(prisma.task.deleteMany({ where: { id: { notIn: taskRows.map(t => t.id) } } }));
    ops.push(prisma.project.deleteMany({ where: { id: { notIn: projectRows.map(p => p.id) } } }));
    ops.push(prisma.note.deleteMany({ where: { id: { notIn: noteRows.map(n => n.id) } } }));
    ops.push(prisma.plannerEvent.deleteMany({ where: { id: { notIn: plannerRows.map(e => e.id) } } }));

    // 2) Gelen her kaydı UPSERT et: varsa güncelle, yoksa oluştur (silme yok).
    for (const row of taskRows) {
      ops.push(prisma.task.upsert({
        where: { id: row.id },
        create: row as unknown as Prisma.TaskCreateInput,
        update: row as unknown as Prisma.TaskUpdateInput,
      }));
    }
    for (const row of projectRows) {
      ops.push(prisma.project.upsert({
        where: { id: row.id },
        create: row as unknown as Prisma.ProjectCreateInput,
        update: row as unknown as Prisma.ProjectUpdateInput,
      }));
    }
    for (const row of noteRows) {
      ops.push(prisma.note.upsert({
        where: { id: row.id },
        create: row as unknown as Prisma.NoteCreateInput,
        update: row as unknown as Prisma.NoteUpdateInput,
      }));
    }
    for (const row of plannerRows) {
      ops.push(prisma.plannerEvent.upsert({
        where: { id: row.id },
        create: row as unknown as Prisma.PlannerEventCreateInput,
        update: row as unknown as Prisma.PlannerEventUpdateInput,
      }));
    }

    // Hepsi tek transaction: ya tamamı uygulanır ya hiçbiri.
    await prisma.$transaction(ops);
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
