const prisma = require('../lib/prisma');

async function main() {
  const count = await prisma.question.count();
  if (count > 0) {
    console.log('Des questions existent déjà en base, seed ignoré.');
    return;
  }

  await prisma.question.createMany({
    data: [
      {
        question: "Quelle est la capitale de la France ?",
        options: ["Lyon", "Paris", "Marseille", "Toulouse"],
        answer: "Paris"
      },
      {
        question: "Combien font 8 + 5 ?",
        options: ["10", "12", "13", "15"],
        answer: "13"
      },
      {
        question: "Qui a peint la Joconde ?",
        options: ["Picasso", "Van Gogh", "Léonard de Vinci", "Monet"],
        answer: "Léonard de Vinci"
      }
    ]
  });

  console.log('3 questions insérées en base.');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
