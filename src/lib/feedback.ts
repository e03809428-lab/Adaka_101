import { supabase } from "./supabase";

export async function sendFeedback(message: string) {
  const cleanMessage = message.trim();

  if (cleanMessage.length < 3) {
    throw new Error("Напиши хотя бы 3 символа.");
  }

  if (cleanMessage.length > 1000) {
    throw new Error("Отзыв слишком длинный. Максимум 1000 символов.");
  }

  const { error } = await supabase
    .from("feedback")
    .insert({ message: cleanMessage });

  if (error) {
    throw new Error(error.message);
  }
}
