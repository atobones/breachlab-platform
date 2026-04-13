export default function RulesPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-amber text-xl">Rules</h1>

      <p className="text-sm">
        The goal of the BreachLab wargames is to provide a training ground for
        people who want to learn real-world offensive and defensive security
        skills. The BreachLab community hosts these levels free of charge for
        players to use and learn from. However, usage of these resources comes
        with a few simple rules.
      </p>

      <section>
        <h2 className="text-amber text-lg mb-2">In general</h2>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-sm">
          <li>
            <strong>Treat every operative with respect.</strong> We will not
            tolerate any form of harassment or discrimination.
          </li>
          <li>
            <strong>We do not allow unsolicited spam or self-promotion</strong>
            {" "}in the chatrooms or private messages.
          </li>
          <li>
            <strong>Do not spoil the game</strong> for others in the chatrooms.
            If you need help, specify the game and level and someone will help
            you in private messages. Do not rely on Discord's / spoiler
            functionality as the chatrooms are mirrored and this functionality
            is not available everywhere.
          </li>
          <li>
            <strong>Do not use easy to guess file or directory names</strong>
            {" "}and <strong>clean up after yourself</strong>. If you have
            created files or directories, please remove them when you are done.
          </li>
          <li>
            <strong>Do not automate brute force</strong> against levels, flag
            submission, or the SSH entry point.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-amber text-lg mb-2">
          For educators and content-creators
        </h2>
        <ol className="list-decimal list-outside pl-5 space-y-2 text-sm">
          <li>
            <strong>Do not publish credentials</strong> to any of the games.
            We understand the need to create writeups, walkthroughs, and
            tutorials, but do not publish any credentials.
          </li>
          <li>
            If you are profiting from the content you create and you are able
            to afford it, please{" "}
            <a href="/donate" className="text-amber">
              consider donating
            </a>{" "}
            a portion of your earnings to the BreachLab community. We are a
            community of volunteers which relies on donations to keep the
            lights on.
          </li>
          <li>
            <strong>Please give credit where credit is due.</strong> If you are
            using content from the BreachLab community, please mention the
            BreachLab community and provide a link to our website.
          </li>
        </ol>
      </section>

      <p className="text-xs text-muted pt-4 border-t border-border">
        By playing BreachLab you accept these rules.
      </p>
    </div>
  );
}
