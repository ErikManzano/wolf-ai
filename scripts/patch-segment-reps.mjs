import fs from 'fs';

const atvPath = 'src/components/AthleteTrainingView.tsx';
let atv = fs.readFileSync(atvPath, 'utf8');
atv = atv.replace(
  `              onToggleSet={(exerciseIndex, schemeIndex, setInstance, actualKg, actualReps, actualSegmentReps) =>
                toggleSetComplete({,
                  actualSegmentReps,
                })
              }
              onUpdateSet={(exerciseIndex, schemeIndex, setInstance, actualKg, actualReps, actualSegmentReps) =>
                updateSetLog({,
                  actualSegmentReps,
                })
              }`,
  `              onToggleSet={(exerciseIndex, schemeIndex, setInstance, actualKg, actualReps, actualSegmentReps) =>
                toggleSetComplete({
                  assignmentId: myAssignment.id,
                  weekNumber: weekData.weekNumber,
                  dayNumber: day.dayNumber,
                  exerciseIndex,
                  schemeIndex,
                  setInstance,
                  actualKg,
                  actualReps,
                  actualSegmentReps,
                })
              }
              onUpdateSet={(exerciseIndex, schemeIndex, setInstance, actualKg, actualReps, actualSegmentReps) =>
                updateSetLog({
                  assignmentId: myAssignment.id,
                  weekNumber: weekData.weekNumber,
                  dayNumber: day.dayNumber,
                  exerciseIndex,
                  schemeIndex,
                  setInstance,
                  actualKg,
                  actualReps,
                  actualSegmentReps,
                })
              }`,
);
fs.writeFileSync(atvPath, atv);

const pgPath = 'src/api/postgresStore.ts';
let pg = fs.readFileSync(pgPath, 'utf8');

if (!pg.includes('actual_segment_reps')) {
  pg = pg.replace(
    `      ON workout_set_logs (
        assignment_id, week_number, day_number, exercise_index, scheme_index, set_instance
      );
    \`);`,
    `      ON workout_set_logs (
        assignment_id, week_number, day_number, exercise_index, scheme_index, set_instance
      );
    \`);
    await this.pool.query(\`
      ALTER TABLE workout_set_logs
      ADD COLUMN IF NOT EXISTS actual_segment_reps JSONB;
    \`);`,
  );
}

pg = pg.replaceAll(
  'set_instance, actual_kg, actual_reps, completed_at',
  'set_instance, actual_kg, actual_reps, actual_segment_reps, completed_at',
);

pg = pg.replace(
  `    actualKg?: number;
    actualReps?: number;
  }): Promise<boolean> {`,
  `    actualKg?: number;
    actualReps?: number;
    actualSegmentReps?: number[];
  }): Promise<boolean> {`,
);

pg = pg.replace(
  `      INSERT INTO workout_set_logs (
        id, assignment_id, week_number, day_number, exercise_index, scheme_index,
        set_instance, actual_kg, actual_reps, completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz);`,
  `      INSERT INTO workout_set_logs (
        id, assignment_id, week_number, day_number, exercise_index, scheme_index,
        set_instance, actual_kg, actual_reps, actual_segment_reps, completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::timestamptz);`,
);

pg = pg.replace(
  `        input.actualKg ?? null,
        input.actualReps ?? null,
        new Date().toISOString(),
      ],
    );
    return true;
  }

  async patchSetLog(input: {`,
  `        input.actualKg ?? null,
        input.actualReps ?? null,
        input.actualSegmentReps?.length ? JSON.stringify(input.actualSegmentReps) : null,
        new Date().toISOString(),
      ],
    );
    return true;
  }

  async patchSetLog(input: {`,
);

pg = pg.replace(
  `    actualKg?: number;
    actualReps?: number;
  }): Promise<SetCompletionLog | null> {`,
  `    actualKg?: number;
    actualReps?: number;
    actualSegmentReps?: number[];
  }): Promise<SetCompletionLog | null> {`,
);

pg = pg.replace(
  `        INSERT INTO workout_set_logs (
          id, assignment_id, week_number, day_number, exercise_index, scheme_index,
          set_instance, actual_kg, actual_reps, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz);`,
  `        INSERT INTO workout_set_logs (
          id, assignment_id, week_number, day_number, exercise_index, scheme_index,
          set_instance, actual_kg, actual_reps, actual_segment_reps, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::timestamptz);`,
);

pg = pg.replace(
  `          input.actualKg ?? null,
          input.actualReps ?? null,
          new Date().toISOString(),
        ],
      );
    } else {
      await this.pool.query(
        \`
        UPDATE workout_set_logs
        SET actual_kg = COALESCE($8, actual_kg),
            actual_reps = COALESCE($9, actual_reps)
        WHERE assignment_id = $1 AND week_number = $2 AND day_number = $3
          AND exercise_index = $4 AND scheme_index = $5 AND set_instance = $6;
        \`,`,
  `          input.actualKg ?? null,
          input.actualReps ?? null,
          input.actualSegmentReps?.length ? JSON.stringify(input.actualSegmentReps) : null,
          new Date().toISOString(),
        ],
      );
    } else {
      await this.pool.query(
        \`
        UPDATE workout_set_logs
        SET actual_kg = COALESCE($8, actual_kg),
            actual_reps = COALESCE($9, actual_reps),
            actual_segment_reps = COALESCE($10::jsonb, actual_segment_reps)
        WHERE assignment_id = $1 AND week_number = $2 AND day_number = $3
          AND exercise_index = $4 AND scheme_index = $5 AND set_instance = $6;
        \`,`,
);

pg = pg.replace(
  `          input.actualKg ?? null,
          input.actualReps ?? null,
        ],
      );
    }
    const rows = await this.getSetLogs(input.assignmentId);`,
  `          input.actualKg ?? null,
          input.actualReps ?? null,
          input.actualSegmentReps?.length ? JSON.stringify(input.actualSegmentReps) : null,
        ],
      );
    }
    const rows = await this.getSetLogs(input.assignmentId);`,
);

if (!pg.includes('actualSegmentReps: Array.isArray')) {
  pg = pg.replace(
    `    ...(row.actual_reps != null ? { actualReps: Number(row.actual_reps) } : {}),
  });`,
    `    ...(row.actual_reps != null ? { actualReps: Number(row.actual_reps) } : {}),
    ...(row.actual_segment_reps != null
      ? {
          actualSegmentReps: Array.isArray(row.actual_segment_reps)
            ? (row.actual_segment_reps as number[])
            : (JSON.parse(String(row.actual_segment_reps)) as number[]),
        }
      : {}),
  });`,
  );
}

fs.writeFileSync(pgPath, pg);

const routesPath = 'src/api/routes.ts';
let routes = fs.readFileSync(routesPath, 'utf8');
if (!routes.includes('actualSegmentReps')) {
  routes = routes.replace(
    `      actualKg?: number;
      actualReps?: number;
    };`,
    `      actualKg?: number;
      actualReps?: number;
      actualSegmentReps?: number[];
    };`,
  );
  routes = routes.replaceAll(
    `      actualReps: body.actualReps != null ? Number(body.actualReps) : undefined,
    };`,
    `      actualReps: body.actualReps != null ? Number(body.actualReps) : undefined,
      actualSegmentReps: Array.isArray(body.actualSegmentReps)
        ? body.actualSegmentReps.map((n) => Number(n))
        : undefined,
    };`,
  );
  routes = routes.replace(
    `        actualReps: payload.actualReps ?? state.setLogs[idx]!.actualReps,
      };`,
    `        actualReps: payload.actualReps ?? state.setLogs[idx]!.actualReps,
        actualSegmentReps: payload.actualSegmentReps ?? state.setLogs[idx]!.actualSegmentReps,
      };`,
  );
}
fs.writeFileSync(routesPath, routes);

console.log('patch complete');
