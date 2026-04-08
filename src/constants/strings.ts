export const STRINGS = {
  badgesPanel: {
    title: '\u7b49\u7ea7\u4e0e\u52cb\u7ae0',
    xp: (xp: number, progress: number) => `XP ${xp}\uff08\u672c\u7ea7\u8fdb\u5ea6 ${progress}/150\uff09`,
    medalCount: (count: number) => `\u52cb\u7ae0 ${count}`,
    unlockedEmpty: '\u5c1a\u672a\u89e3\u9501\u52cb\u7ae0\uff0c\u5b8c\u6210\u8bad\u7ec3\u5373\u53ef\u5f00\u59cb\u6536\u96c6\u3002',
    upcomingTitle: '\u5f85\u89e3\u9501',
    targetPrefix: '\u76ee\u6807\uff1a'
  },
  charts: {
    dailyCEITitle: '\u8fd1 28 \u5929 CEI \u8d8b\u52bf',
    dailyCEIEmpty: '\u6682\u65e0\u6570\u636e\uff0c\u5b8c\u6210\u4e00\u6b21\u8bad\u7ec3\u540e\u5373\u53ef\u67e5\u770b\u3002',
    dailyHeatmapTitle: '\u8fd1 28 \u5929\u8bad\u7ec3\u70ed\u529b\u56fe',
    dailyHeatmapEmpty: '\u6682\u65e0\u6570\u636e\uff0c\u5b8c\u6210\u4e00\u6b21\u8bad\u7ec3\u540e\u5373\u53ef\u67e5\u770b\u3002',
    weeklyMinutesTitle: '\u8fd1 8 \u5468\u8bad\u7ec3\u65f6\u957f',
    weeklyMinutesEmpty: '\u8fd8\u6ca1\u6709\u672c\u5468\u7684\u8bad\u7ec3\u6570\u636e\u3002'
  },
  app: {
    recentTitle: '\u6700\u8fd1\u8bb0\u5f55',
    recentWithCount: (count: number) => `\u6700\u8fd1 ${count} \u6b21`,
    recentEmpty: '\u6682\u65e0\u8bb0\u5f55\uff0c\u5b8c\u6210\u8bad\u7ec3\u540e\u53ef\u5728\u6b64\u67e5\u770b\u3002',
    recentNoScore: '\u672a\u8bc4\u5206',
    ejaculatedYes: '\u5df2\u5c04\u7cbe',
    ejaculatedNo: '\u672a\u5c04\u7cbe',
    delete: '\u5220\u9664',
    updateBaseline: '\u66f4\u65b0\u57fa\u51c6'
  }
};