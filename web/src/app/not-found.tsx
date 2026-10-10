import ShopLayout from "./(shop)/layout";
import ShopNotFound from "./(shop)/not-found";

// Несуществующие URL вне витрины — та же 404 с шапкой и подвалом
export default function NotFound() {
  return (
    <ShopLayout params={Promise.resolve({})}>
      <ShopNotFound />
    </ShopLayout>
  );
}
