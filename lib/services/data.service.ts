import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { AppData, Task, Project, Note, PlannerEvent } from '@/lib/types';

/**
 * DataService
 * ------------
 * Tüm Postgres erişimi burada toplanır (Java'daki @Service katmanı gibi).
 * HTTP/route katmanı (app/api/data/route.ts) bu servisi çağırır; SQL/Prisma
 * detaylarını bilmez. Böylece sorumluluklar ayrışır ve kod karışmaz:
 *   - route.ts  -> sadece istek/cevap (HTTP)
 *   - service   -> iş + veritabanı mantığı
 *   - lib/db.ts -> Prisma bağlantısı (singleton)
 */

// ---------------------------------------------------------------------------
// 1) Satır eşleyiciler: uygulama tipini Postgres satırına çevirir.
//    jsonb alanlara güvenli varsayılan (boş dizi) verir.
// ---------------------------------------------------------------------------

function toTaskRow(t: Task) {
  return {
    ...t,
    tags: t.tags ?? [],
    problemSolutions: t.problemSolutions ?? [],
    acceptanceCriteria: t.acceptanceCriteria ?? [],
    references: t.references ?? [],
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

// ---------------------------------------------------------------------------
// 2) Servis: dışarıya açılan iki metot — getAll (oku) ve save (yaz).
// ---------------------------------------------------------------------------

export const dataService = {
  /** Tüm tablolardan okuyup tek bir AppData nesnesi olarak döner. */
  async getAll(): Promise<AppData> {
    const [tasks, projects, notes, plannerEvents] = await Promise.all([
      prisma.task.findMany(),
      prisma.project.findMany(),
      prisma.note.findMany(),
      prisma.plannerEvent.findMany(),
    ]);

    return {
      tasks: tasks as unknown as Task[],
      projects: projects as unknown as Project[],
      notes: notes as unknown as Note[],
      plannerEvents: plannerEvents as unknown as PlannerEvent[],
    };
  },

  /**
   * Gelen tüm durumu kaydeder.
   * - Var olan kayıt UPSERT edilir (yerinde güncellenir, silinmez).
   * - Yalnızca gelen veride artık olmayan kayıt (UI'dan silinmiş) silinir.
   * - Hepsi tek transaction: ya tamamı uygulanır ya hiçbiri.
   */
  async save(data: AppData): Promise<void> {
    const taskRows = data.tasks.map(toTaskRow);
    const projectRows = data.projects.map(toProjectRow);
    const noteRows = data.notes.map(toNoteRow);
    const plannerRows = data.plannerEvents.map(toPlannerRow);

    const ops: Prisma.PrismaPromise<unknown>[] = [];

    // (a) Artık gelmeyen (silinmiş) kayıtları temizle.
    //     notIn: [] -> Prisma "hepsi" olarak yorumlar; liste boşsa tümü silinir.
    ops.push(prisma.task.deleteMany({ where: { id: { notIn: taskRows.map(t => t.id) } } }));
    ops.push(prisma.project.deleteMany({ where: { id: { notIn: projectRows.map(p => p.id) } } }));
    ops.push(prisma.note.deleteMany({ where: { id: { notIn: noteRows.map(n => n.id) } } }));
    ops.push(prisma.plannerEvent.deleteMany({ where: { id: { notIn: plannerRows.map(e => e.id) } } }));

    // (b) Gelen her kaydı upsert et (varsa güncelle, yoksa oluştur).
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

    await prisma.$transaction(ops);
  },
};
