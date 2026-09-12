import { redirect } from "next/navigation";

/* La raíz no muestra nada propia: el proxy ya mandó a /ingresar a quien no
   tiene sesión, así que llegar acá con sesión significa ir al sistema. */
export default function Raiz() {
  redirect("/inicio");
}
