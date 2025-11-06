module.exports.handleJoin = (client, nick, channel) => {
  // اضافه کردن کد خوش آمد گویی
  const GREETINGS_POOL = [
    "salam! khosh omadi! 🎉",
    "chetori? omidvaram khoobi!",
    "salam dostam, be channel khosh amadid!",
    "salam! khoshbakhti didamet 😄",
    "salam bar to! be donyaye khosh omadi!"
  ];

  const greeting = GREETINGS_POOL[Math.floor(Math.random() * GREETINGS_POOL.length)];
  client.say(channel, `${greeting} ${nick}!`);
};
