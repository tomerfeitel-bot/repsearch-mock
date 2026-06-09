const { runQuery, closePool } = require('./db')
const { EXERCISES_SEED } = require('./exercisesSeed')

async function seedExercises() {
  for (const ex of EXERCISES_SEED) {
    await runQuery(
      `INSERT INTO exercises (id, name, primary_muscle, secondary_muscle, movement_pattern, equipment_type, force_vector, bilateral)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         primary_muscle = EXCLUDED.primary_muscle,
         secondary_muscle = EXCLUDED.secondary_muscle,
         movement_pattern = EXCLUDED.movement_pattern,
         equipment_type = EXCLUDED.equipment_type,
         force_vector = EXCLUDED.force_vector,
         bilateral = EXCLUDED.bilateral`,
      [
        ex.id,
        ex.name,
        ex.primary_muscle,
        ex.secondary_muscle ?? null,
        ex.movement_pattern,
        ex.equipment_type,
        ex.force_vector,
        ex.bilateral ? 1 : 0,
      ],
    )
  }
  console.log(`Seeded ${EXERCISES_SEED.length} exercises`)
}

async function main() {
  await seedExercises()
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => closePool())
