<script lang="ts">
    const section = 'mb-8'
    const heading = 'mb-3 font-serif text-[19px] font-medium italic text-text-2'
    const body = 'mb-3 max-w-[68ch] text-sm leading-[1.7] text-text-2'
    const list = 'mb-3 max-w-[68ch] list-disc pl-5 text-sm leading-[1.7] text-text-2 marker:text-muted'
</script>

<svelte:head><title>Политика конфиденциальности — Orbit</title></svelte:head>

<div class="max-w-195">
    <h1 class="mb-2.5 font-serif text-[clamp(2rem,8vw,2.8rem)] font-medium leading-[1.02] tracking-[-0.035em]">
        Политика конфиденциальности
    </h1>
    <p class="mb-9 max-w-[68ch] text-sm leading-[1.7] text-muted">
        Без юридических формулировок. Ниже — что именно хранится, кому уходит и чего мы обещать не можем.
    </p>

    <section class={section}>
        <h2 class={heading}>Что хранится</h2>
        <ul class={list}>
            <li>расшифровка голосового или текст сообщения;</li>
            <li>заголовок, краткое содержание, категория, теги и следующий шаг — это результат разбора моделью;</li>
            <li>сам аудиофайл;</li>
            <li>ваш Telegram ID и ник, если он у вас есть;</li>
            <li>адрес почты — только если вы сами его привязали.</li>
        </ul>
    </section>

    <section class={section}>
        <h2 class={heading}>Кому это уходит</h2>
        <ul class={list}>
            <li><strong>OpenAI</strong> — аудио, для расшифровки;</li>
            <li><strong>Anthropic</strong> — текст расшифровки, для разбора;</li>
            <li><strong>Supabase</strong> — база данных и хранилище файлов;</li>
            <li><strong>Telegram</strong> — сама переписка с ботом;</li>
            <li><strong>Timeweb</strong> — сервер дашборда, <strong>Railway</strong> — сервер бота.</li>
        </ul>
        <p class={body}>
            База данных и хранилище файлов — Supabase, регион Токио (<code>ap-northeast-1</code>). Серверы OpenAI,
            Anthropic и Railway тоже за пределами России. В России размещён только дашборд.
        </p>
    </section>

    <section class={section}>
        <h2 class={heading}>Что можно проверить, а не принять на веру</h2>
        <ul class={list}>
            <li>
                Чужие записи вам не видны, а ваши — никому. Это устроено в самой базе (Row Level Security,
                <code>user_id = auth.uid()</code>), а не в коде приложения, который можно случайно обойти.
            </li>
            <li>
                В журналы сервера содержимое не попадает. Пишутся только длины и идентификаторы — например
                <code>Transcript (412 chars)</code>.
            </li>
            <li>
                Когда обработка падает, оператору приходит уведомление <strong>без текста и без расшифровки</strong>.
                Чтобы знать, что сломалось, не нужно читать, о чём вы говорили.
            </li>
            <li>
                Исходный код открыт:
                <a href="https://github.com/vito2005/orbit" target="_blank" rel="noopener">github.com/vito2005/orbit</a
                >. Всё написанное здесь можно сверить с ним.
            </li>
        </ul>
    </section>

    <section class={section}>
        <h2 class={heading}>Что придётся признать</h2>
        <ul class={list}>
            <li>Расшифровка уходит в OpenAI и Anthropic — без этого продукта не существует.</li>
            <li>Аудиофайлы хранятся и сами по себе не удаляются.</li>
            <li>
                У оператора есть доступ к базе. Технически он может прочитать всё, что вы записали. Средств, которые
                делали бы это невозможным, здесь нет, и утверждать обратное было бы неправдой.
            </li>
        </ul>
        <p class={body}>
            Полностью закрытое хранение (когда прочитать не может никто, включая нас) в этом продукте недостижимо:
            модель обязана видеть текст, иначе ей нечего разбирать.
        </p>
    </section>

    <section class={section}>
        <h2 class={heading}>Как удалить</h2>
        <p class={body}>
            Отдельные записи удаляются кнопкой в журнале — сразу и насовсем. Чтобы удалить аккаунт целиком вместе с
            аудио, напишите оператору: <a href="https://t.me/alexbuki" target="_blank" rel="noopener">@alexbuki</a>.
            Кнопку для этого ещё не сделали, и пока её нет — честнее сказать так, чем обещать.
        </p>
    </section>
</div>
