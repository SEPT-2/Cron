import { PrismaClient } from '@prisma/client';
import { fetchQuestions } from './openai/openai';

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.questions.deleteMany({
    where: {
      created_at: {
        // 1 day ago
        lt: new Date(Date.now() - 1000 * 60 * 60 * 24)
      }
    }
  })

  if (count <= 0) {
    console.log('No questions to delete');
    prisma.$disconnect();
    return;
  }

  const newQuestions = await fetchQuestions();


  const newData = newQuestions.questions.map(q => {
    return {
      content: q.question,
      field: q.field,
      created_at: new Date(),
    }
  })

  const insertedQ = await prisma.questions.createManyAndReturn({
    select: { id: true, content: true }, data: newData,
  });

  const answers = newQuestions.questions.flatMap(question => {
    const a = insertedQ.filter(q => q.content === question.question)[0]
    return question.answers.map(answer => {
      return {
        content: answer.answer,
        type: answer.type,
        question_id: a.id
      }
    })
  });

  await prisma.answers.createMany({
    data: answers
  });


  console.log('Questions and answers have been updated');
  prisma.$disconnect();
  return;
}

main().then(() => { process.exit() }).catch(e => { console.error(e); process.exit(1) });