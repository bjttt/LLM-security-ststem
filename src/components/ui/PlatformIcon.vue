<script setup>
defineProps({ name: { type: String, default: 'shield' } })
const paths = {
  shield: ['M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z', 'm8.5 12 2.5 2.5 4.5-5'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  scan: ['M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5', 'M7 12h10', 'M12 7v10'],
  book: ['M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4z', 'M13 7a3 3 0 0 1 3-3h5v14h-4a4 4 0 0 0-4 3'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
  chevron: ['m9 5 7 7-7 7'],
  spark: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'],
  image: ['M4 4h16v16H4z', 'm4 16 5-5 4 4 3-3 4 4', 'M15 8h.01'],
  brain: ['M12 5a3 3 0 0 0-5-2 4 4 0 0 0-4 6 4 4 0 0 0 1 7 4 4 0 0 0 8 3V5Z', 'M12 5a3 3 0 0 1 5-2 4 4 0 0 1 4 6 4 4 0 0 1-1 7 4 4 0 0 1-8 3', 'M7 9c3 0 3 3 3 3M17 9c-3 0-3 3-3 3'],
  chat: ['M21 11a8 8 0 0 1-8 8H5l-3 3V11a8 8 0 0 1 8-8h3a8 8 0 0 1 8 8Z', 'M7 9h9M7 13h6'],
  stamp: ['M5 16h14l2 4H3z', 'M8 16v-5h8v5', 'M9 11V6a3 3 0 0 1 6 0v5'],
  check: ['m5 12 4 4L19 6'],
  clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 7v5l3 2'],
  layers: ['m12 3 10 5-10 5L2 8Z', 'm2 12 10 5 10-5', 'm2 16 10 5 10-5'],
  upload: ['M12 16V3', 'm7 8 5-5 5 5', 'M4 15v6h16v-6'],
  plus: ['M12 5v14M5 12h14'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  close: ['m6 6 12 12M6 18 18 6'],
  help: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 16h.01'],
  activity: ['M2 12h5l3-8 4 16 3-8h5'],
}
</script>

<template>
  <svg class="platform-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(d, index) in (paths[name] || paths.shield)" :key="index" :d="d" />
  </svg>
</template>
