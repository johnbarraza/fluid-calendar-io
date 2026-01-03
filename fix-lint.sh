#!/bin/bash

# Remove unused imports in AI chat route
sed -i '/import {$/,/} from "@\/lib\/mcp\/tools\/calendar-tools";/ {
  s/  updateEvent,//
  s/  deleteEvent,//
}' src/app/api/ai-chat/route.ts

# Remove unused Message interface
sed -i '/^interface Message {$/,/^}$/d' src/app/api/ai-chat/route.ts

# Remove unused X import from RoutineBuilder
sed -i 's/, LuX as X//' src/components/adhd/routines/RoutineBuilder.tsx

# Remove unused CheckCircle from RoutineCard  
sed -i 's/, LuCheckCircle2 as CheckCircle//' src/components/adhd/routines/RoutineCard.tsx

# Remove unused RoutineCompletion from RoutineExecutor
sed -i 's/, RoutineCompletion//' src/components/adhd/routines/RoutineExecutor.tsx

# Remove unused Button from adhd page
sed -i '/^import { Button } from "@\/components\/ui\/button";$/d' src/app/\(common\)/adhd/page.tsx

# Fix const vs let in HabitTrackingService
sed -i 's/let currentDate = new Date()/const currentDate = new Date()/' src/services/adhd/HabitTrackingService.ts

echo "Lint fixes applied"
