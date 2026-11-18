/** `ui-studio` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'rail.aria': '功能区',
  'rail.work': '工作',
  'rail.code': '编程',
  'rail.image': '图像',
  'rail.video': '视频',
  'work.title': '工作区',
  'work.description': '与代理对话，安排任务，产出结果',
  'code.title': '编程',
  'code.description': '浏览代码、编辑文件、查看结构地图',
  'image.title': '图像生成',
  'image.description': '用提示词生成与迭代图像',
  'video.title': '视频生成',
  'video.description': '从文本或图像生成视频片段',
  'common.soon': '即将推出',
  'code.explorer': '文件',
  'code.map': '代码地图',
  'code.map.empty': '打开文件后显示结构',
} satisfies Record<string, string>

/** The studio namespace key union. */
export type StudioKey = keyof typeof zh

/** English dictionary. */
export const en: Record<StudioKey, string> = {
  'rail.aria': 'Workspaces',
  'rail.work': 'Work',
  'rail.code': 'Code',
  'rail.image': 'Image',
  'rail.video': 'Video',
  'work.title': 'Workspace',
  'work.description': 'Talk to the agent, schedule tasks, ship results',
  'code.title': 'Code',
  'code.description': 'Browse code, edit files, read the structure map',
  'image.title': 'Image generation',
  'image.description': 'Generate and iterate on images from a prompt',
  'video.title': 'Video generation',
  'video.description': 'Turn text or stills into video clips',
  'common.soon': 'Coming soon',
  'code.explorer': 'Files',
  'code.map': 'Code map',
  'code.map.empty': 'Open a file to see its structure',
}

/** Japanese dictionary. */
export const ja: Record<StudioKey, string> = {
  'rail.aria': 'ワークスペース',
  'rail.work': '作業',
  'rail.code': 'コード',
  'rail.image': '画像',
  'rail.video': '動画',
  'work.title': 'ワークスペース',
  'work.description': 'エージェントと対話し、タスクを整理し、成果をまとめる',
  'code.title': 'コード',
  'code.description': 'コードを閲覧し、ファイルを編集し、構造マップを見る',
  'image.title': '画像生成',
  'image.description': 'プロンプトから画像を生成して反復する',
  'video.title': '動画生成',
  'video.description': 'テキストや静止画から動画クリップを作る',
  'common.soon': '近日公開',
  'code.explorer': 'ファイル',
  'code.map': 'コードマップ',
  'code.map.empty': 'ファイルを開くと構造が表示されます',
}

/** Spanish dictionary. */
export const es: Record<StudioKey, string> = {
  'rail.aria': 'Espacios de trabajo',
  'rail.work': 'Trabajo',
  'rail.code': 'Código',
  'rail.image': 'Imagen',
  'rail.video': 'Vídeo',
  'work.title': 'Espacio de trabajo',
  'work.description': 'Habla con el agente, organiza tareas y entrega resultados',
  'code.title': 'Código',
  'code.description': 'Explora el código, edita archivos y lee el mapa de estructura',
  'image.title': 'Generación de imágenes',
  'image.description': 'Genera e itera imágenes a partir de un prompt',
  'video.title': 'Generación de vídeo',
  'video.description': 'Convierte texto o imágenes en clips de vídeo',
  'common.soon': 'Próximamente',
  'code.explorer': 'Archivos',
  'code.map': 'Mapa de código',
  'code.map.empty': 'Abre un archivo para ver su estructura',
}

/** French dictionary. */
export const fr: Record<StudioKey, string> = {
  'rail.aria': 'Espaces de travail',
  'rail.work': 'Travail',
  'rail.code': 'Code',
  'rail.image': 'Image',
  'rail.video': 'Vidéo',
  'work.title': 'Espace de travail',
  'work.description': "Dialoguez avec l'agent, planifiez les tâches, livrez les résultats",
  'code.title': 'Code',
  'code.description': 'Parcourez le code, modifiez les fichiers, lisez la carte de structure',
  'image.title': "Génération d'images",
  'image.description': 'Générez et itérez des images à partir d\'un prompt',
  'video.title': 'Génération de vidéos',
  'video.description': 'Transformez du texte ou des images en clips vidéo',
  'common.soon': 'Bientôt disponible',
  'code.explorer': 'Fichiers',
  'code.map': 'Carte du code',
  'code.map.empty': 'Ouvrez un fichier pour voir sa structure',
}

/** German dictionary. */
export const de: Record<StudioKey, string> = {
  'rail.aria': 'Arbeitsbereiche',
  'rail.work': 'Arbeit',
  'rail.code': 'Code',
  'rail.image': 'Bild',
  'rail.video': 'Video',
  'work.title': 'Arbeitsbereich',
  'work.description': 'Mit dem Agenten sprechen, Aufgaben planen, Ergebnisse liefern',
  'code.title': 'Code',
  'code.description': 'Code durchsuchen, Dateien bearbeiten, Strukturkarte lesen',
  'image.title': 'Bilderzeugung',
  'image.description': 'Bilder aus einem Prompt erzeugen und weiterentwickeln',
  'video.title': 'Videogenerierung',
  'video.description': 'Text oder Standbilder in Videoclips verwandeln',
  'common.soon': 'Demnächst',
  'code.explorer': 'Dateien',
  'code.map': 'Codekarte',
  'code.map.empty': 'Datei öffnen, um die Struktur zu sehen',
}

/** Russian dictionary. */
export const ru: Record<StudioKey, string> = {
  'rail.aria': 'Рабочие области',
  'rail.work': 'Работа',
  'rail.code': 'Код',
  'rail.image': 'Изображение',
  'rail.video': 'Видео',
  'work.title': 'Рабочая область',
  'work.description': 'Общайтесь с агентом, планируйте задачи, получайте результат',
  'code.title': 'Код',
  'code.description': 'Просмотр кода, правка файлов, карта структуры',
  'image.title': 'Генерация изображений',
  'image.description': 'Создавайте и дорабатывайте изображения по описанию',
  'video.title': 'Генерация видео',
  'video.description': 'Превращайте текст или кадры в видеоклипы',
  'common.soon': 'Скоро',
  'code.explorer': 'Файлы',
  'code.map': 'Карта кода',
  'code.map.empty': 'Откройте файл, чтобы увидеть структуру',
}

/** Portuguese dictionary. */
export const pt: Record<StudioKey, string> = {
  'rail.aria': 'Áreas de trabalho',
  'rail.work': 'Trabalho',
  'rail.code': 'Código',
  'rail.image': 'Imagem',
  'rail.video': 'Vídeo',
  'work.title': 'Área de trabalho',
  'work.description': 'Converse com o agente, organize tarefas e entregue resultados',
  'code.title': 'Código',
  'code.description': 'Navegue pelo código, edite arquivos e leia o mapa de estrutura',
  'image.title': 'Geração de imagens',
  'image.description': 'Gere e itere imagens a partir de um prompt',
  'video.title': 'Geração de vídeo',
  'video.description': 'Transforme texto ou imagens em clipes de vídeo',
  'common.soon': 'Em breve',
  'code.explorer': 'Arquivos',
  'code.map': 'Mapa de código',
  'code.map.empty': 'Abra um arquivo para ver sua estrutura',
}
