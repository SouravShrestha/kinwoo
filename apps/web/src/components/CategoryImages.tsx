import Image from "next/image";

import { expenseCategoryImage, itemCategoryImage, listIconImage } from "@/lib/category-images";

function CategoryImage({ src, size }: { src: string; size: number }) {
  return <Image src={src} alt="" width={size} height={size} className="shrink-0 object-contain" />;
}

export function ExpenseCategoryImage({ category, size }: { category: string; size: number }) {
  return <CategoryImage src={expenseCategoryImage(category)} size={size} />;
}

export function ItemCategoryImage({
  name,
  size,
}: {
  name: string | null | undefined;
  size: number;
}) {
  return <CategoryImage src={itemCategoryImage(name)} size={size} />;
}

export function ListIconImage({ label, size }: { label: string; size: number }) {
  return <CategoryImage src={listIconImage(label)} size={size} />;
}
