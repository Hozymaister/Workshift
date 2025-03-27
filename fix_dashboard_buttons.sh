#!/bin/bash

# Najde všechny výskyty tlačítek pro odstranění widgetů, které nejsou obaleny podmínkou
grep -n "onClick.*handleRemoveWidget" client/src/pages/dashboard-page.tsx | grep -v "isEditMode \|\| isMobile" > dashboard_button_lines.txt

# Pro každý nalezený výskyt opraví kód
while IFS=: read -r line_number rest; do
  line_number=$((line_number - 6))  # Jdeme 6 řádků zpět, abychom našli začátek tlačítka
  
  # Získá aktuální neupravený blok se 12 řádky
  sed -n "${line_number},+12p" client/src/pages/dashboard-page.tsx > temp_block.txt
  
  # Vymění příslušné řádky v souboru
  widget_type=$(grep -o "WidgetType\.[A-Z_]*" temp_block.txt | head -1)
  
  sed -i "${line_number}s/^              <Button/              {(isEditMode || isMobile) \&\& (\n                <Button/" client/src/pages/dashboard-page.tsx
  line_end=$((line_number + 7))
  sed -i "${line_end}s/^              <\/Button>/                <\/Button>\n              )}/" client/src/pages/dashboard-page.tsx
  
  echo "Opravena podmínka pro ${widget_type} na řádku ${line_number}"
done < dashboard_button_lines.txt

rm temp_block.txt dashboard_button_lines.txt
