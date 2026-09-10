/* Keeps companion-experience editorial state stable when the legacy geological
   timeline updates underneath a reference-video mode. Loaded after experiences.js. */
(() => {
  const HERO_BY_EXPERIENCE = {
    civilization: {
      eyebrow: 'Human journeys',
      title: 'A world becoming connected.',
      copy: 'Follow broad dispersal routes as people move across continents and coastlines through the late Pleistocene.'
    },
    orbit: {
      eyebrow: '01 / A world in orbit',
      title: 'A world in orbit.',
      copy: 'Thousands of objects circle the planet. Explore the orbital infrastructure surrounding our home.'
    },
    moon: {
      eyebrow: '02 / Our celestial companion',
      title: 'Another world. Within reach.',
      copy: 'A landscape written by impacts. Explore the Moon through a sequence of landmark missions and places.'
    },
    earthquakes: {
      eyebrow: '03 / The ground is moving',
      title: 'Earthquakes. A planet in motion.',
      copy: 'Every signal is a recorded disturbance. Together they trace the restless edges and interiors of a changing planet.'
    },
    oceans: {
      eyebrow: '04 / A planet connected by water',
      title: 'An ocean. Always moving.',
      copy: 'Beneath a familiar blue surface, water is always on the move. Follow the currents that connect our ocean basins.'
    },
    solar: {
      eyebrow: '05 / Beyond our world',
      title: 'Everything in motion.',
      copy: 'Eight worlds. One star. A celestial dance shaped by gravity and time.'
    }
  };

  function restoreExperienceHero() {
    const def = HERO_BY_EXPERIENCE[state.experience];
    if (!def) return;
    els.eyebrow.textContent = def.eyebrow;
    els.storyTitle.textContent = def.title;
    els.storyCopy.textContent = def.copy;
    els.mobileTitle.textContent = def.title;
    els.mobileCopy.textContent = def.copy;
  }

  const geologicalSetAge = setAge;
  setAge = function bridgedSetAge(age, options = {}) {
    geologicalSetAge(age, options);
    restoreExperienceHero();
  };

  // A companion mode can already be active when this bridge initializes.
  restoreExperienceHero();
})();
