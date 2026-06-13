// Template de las pantallas internas: a diferencia del layout, se vuelve a
// montar en cada navegación, por eso la animación de entrada corre cada vez.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="pagina-entra">{children}</div>;
}
