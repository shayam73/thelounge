// welcome.js

module.exports = (client, replyTarget, data, args) => {
  // چک می‌کنیم که دستور دارای آرگومان باشد
  if (args[0]) {
    const sub = args[0].toLowerCase();
    
    // بررسی می‌کنیم که آیا کانال وجود دارد یا خیر
    ensureChannel(replyTarget);
    
    // فعال یا غیرفعال کردن خوش‌آمدگویی
    if (sub === "on") {
      data.channelSettings[replyTarget].welcome = true;
      client.say(replyTarget, `✅ خوش‌آمدگویی در کانال ${replyTarget} فعال شد.`);
    } else if (sub === "off") {
      data.channelSettings[replyTarget].welcome = false;
      client.say(replyTarget, `❌ خوش‌آمدگویی در کانال ${replyTarget} غیرفعال شد.`);
    } else {
      client.say(replyTarget, "لطفاً از 'on' یا 'off' برای فعال یا غیرفعال کردن خوش‌آمدگویی استفاده کنید.");
    }
    
    // ذخیره تنظیمات جدید در فایل JSON
    saveData();
  } else {
    client.say(replyTarget, "برای تنظیم خوش‌آمدگویی، لطفاً 'on' یا 'off' را به عنوان آرگومان وارد کنید.");
  }
};

// وقتی یک نفر وارد کانال شد
module.exports.handleJoin = (client, nick, channel, data) => {
  if (!nick) return;

  // اگر خوش‌آمدگویی برای کانال فعال است
  const chSet = data.channelSettings[channel] || { welcome: true };
  if (!chSet.welcome) return; // اگر خوش‌آمدگویی غیرفعال باشد، هیچ پیامی ارسال نمی‌شود

  // لیست پیام‌های خوش‌آمدگویی مختلف
  const greetings = [
    `سلام ${nick}! خوش آمدی! 🎉`,
    `خوش آمدید ${nick}! امیدوارم روز خوبی داشته باشید! 😊`,
    `سلام ${nick}! خوشحالم که به کانال پیوستی! 👋`,
    `سلام ${nick}! خوش آمدید به کانال! 😄`
  ];

  // انتخاب یک پیام تصادفی از لیست خوش‌آمدگویی
  const greetingMessage = greetings[Math.floor(Math.random() * greetings.length)];

  // ارسال پیام خوش‌آمدگویی به کانال
  client.say(channel, greetingMessage);
};
