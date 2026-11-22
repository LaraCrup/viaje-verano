-- Paleta de 5 colores (design system "Viaje 2026"): capítulos e integrantes.
-- Solo cambia las filas que siguen con el color original del seed (no pisa elecciones de las chicas).
update public.chapters c set color = v.color, accent = v.accent, client_updated_at = now()
from (values
  ('Ida',    '#5B5BD6', '#2F1847', '#F9B3D1'),
  ('Israel', '#0E7C86', '#624763', '#D63AF9'),
  ('Madrid', '#D7263D', '#C62E65', '#F9B3D1'),
  ('Niza',   '#0369A1', '#972DB5', '#EDA6FC'),
  ('Roma',   '#B4472A', '#F9B3D1', '#D63AF9')
) as v(name, old_color, color, accent)
where c.name = v.name and upper(c.color) = v.old_color;

update public.members m set color = v.color, client_updated_at = now()
from (values
  ('Wile', '#C81E64', '#C62E65'), ('Lara', '#6D28D9', '#972DB5'), ('Juli', '#0F766E', '#624763'),
  ('Ivi', '#C2410C', '#2F1847'), ('Meli', '#1D4ED8', '#F9B3D1'), ('Solcha', '#8A5A00', '#EDA6FC')
) as v(name, old_color, color)
where m.name = v.name and upper(m.color) = v.old_color;
