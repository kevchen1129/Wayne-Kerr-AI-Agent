import type { Locale } from "@/lib/i18n";
import { getPriceSummary, getStayNights, type PriceableListing, type StaySearch } from "@/lib/pricing";

type UnavailableRange = {
  start: string;
  end: string;
};

type ListingSeed = PriceableListing & {
  slug: string;
  buildingId: "bund-residences" | "lotus-tower";
  unitNumber: string;
  bedroomType: "Studio" | "1 Bedroom" | "2 Bedroom";
  bedroomCount: number;
  sizeSqm: number;
  guestCapacity: number;
  bathroomCount: number;
  availableFrom: string;
  floor: number;
  walkMinutes: number;
  theme: string;
  descriptionEn: string;
  descriptionZh: string;
  kitchenFacilitiesEn: string;
  kitchenFacilitiesZh: string;
  workspaceEn: string;
  workspaceZh: string;
  checkInMethodEn: string;
  checkInMethodZh: string;
  cancellationTermsEn: string;
  cancellationTermsZh: string;
  longStayTermsEn: string;
  longStayTermsZh: string;
  unavailableRanges?: UnavailableRange[];
};

type GalleryItem = {
  src: string;
  label: string;
};

const imagePool = [
  "/images/units/studio-living.png",
  "/images/units/studio-bright.png",
  "/images/units/bedroom-loft.png",
  "/images/units/kitchen-yellow.png",
] as const;

const buildingContent = {
  en: {
    "bund-residences": {
      name: "Bund Residences",
      area: "Shanghai, Jing'an fringe",
      walk: "7 min to metro",
      address: "Lane 88, North Xiangyang Road, Shanghai",
      description:
        "A guest-facing serviced apartment building with practical layouts, efficient housekeeping, and easy access to business districts.",
    },
    "lotus-tower": {
      name: "Lotus Tower",
      area: "Beijing, Chaoyang core",
      walk: "9 min to metro",
      address: "No. 218, Dongdaqiao Road, Beijing",
      description:
        "A quieter serviced apartment tower designed for relocation stays, project teams, and professionals needing reliable mid-stay operations.",
    },
  },
  zh: {
    "bund-residences": {
      name: "外滩雅寓",
      area: "上海，静安边界",
      walk: "步行 7 分钟到地铁",
      address: "上海市襄阳北路 88 弄",
      description:
        "面向租客的 serviced apartment 楼栋，格局实用，保洁与营运稳定，前往主要商务区也很方便。",
    },
    "lotus-tower": {
      name: "莲庭大厦",
      area: "北京，朝阳核心",
      walk: "步行 9 分钟到地铁",
      address: "北京市东大桥路 218 号",
      description:
        "较安静的 serviced apartment 塔楼，适合搬迁、项目团队与需要稳定中长期居住营运服务的住客。",
    },
  },
} as const;

const listingSeeds: ListingSeed[] = [
  {
    slug: "bund-studio-a1",
    buildingId: "bund-residences",
    unitNumber: "A1",
    bedroomType: "Studio",
    bedroomCount: 0,
    sizeSqm: 31,
    guestCapacity: 2,
    bathroomCount: 1,
    availableFrom: "2026-07-28",
    floor: 6,
    walkMinutes: 7,
    theme: "coral",
    minimumStay: 1,
    nightlyRate: 120,
    weeklyRate: 735,
    monthlyRate: 2800,
    cleaningFee: 60,
    deposit: 500,
    utilitiesIncluded: true,
    housekeepingFrequency: "Weekly",
    descriptionEn: "Bright studio with a window-side desk, full kitchenette, and a layout tailored for solo or couple stays.",
    descriptionZh: "明亮 studio，附窗边书桌、完整小厨房与适合单人或双人入住的俐落格局。",
    kitchenFacilitiesEn: "Induction hob, microwave, under-counter fridge, cookware, tableware",
    kitchenFacilitiesZh: "电磁炉、微波炉、台下冰箱、锅具与餐具",
    workspaceEn: "Dedicated desk by the window with task lighting",
    workspaceZh: "窗边独立书桌，附工作灯",
    checkInMethodEn: "Self check-in with smart lock code sent 24 hours before arrival",
    checkInMethodZh: "入住前 24 小时发送智慧门锁密码，自助入住",
    cancellationTermsEn: "Free cancellation up to 7 days before check-in.",
    cancellationTermsZh: "入住前 7 天可免费取消。",
    longStayTermsEn: "Stays over 30 nights require passport registration and one mid-stay inspection.",
    longStayTermsZh: "超过 30 晚需完成证件登记，并安排一次中期房况检查。",
    unavailableRanges: [{ start: "2026-09-10", end: "2026-09-18" }],
  },
  {
    slug: "bund-studio-a2",
    buildingId: "bund-residences",
    unitNumber: "A2",
    bedroomType: "Studio",
    bedroomCount: 0,
    sizeSqm: 32,
    guestCapacity: 2,
    bathroomCount: 1,
    availableFrom: "2026-07-29",
    floor: 8,
    walkMinutes: 7,
    theme: "sand",
    minimumStay: 1,
    nightlyRate: 124,
    weeklyRate: 760,
    monthlyRate: 2890,
    cleaningFee: 60,
    deposit: 550,
    utilitiesIncluded: true,
    housekeepingFrequency: "Weekly",
    descriptionEn: "Neutral-toned studio with stronger entry storage and a broader kitchenette counter for longer setups.",
    descriptionZh: "中性色调 studio，入门收纳更完整，也有较宽的备餐台面，适合较长入住。",
    kitchenFacilitiesEn: "Induction hob, combi oven, fridge, cookware, electric kettle",
    kitchenFacilitiesZh: "电磁炉、蒸烤微波炉、冰箱、锅具、电热水壶",
    workspaceEn: "Fold-out work table and lounge chair",
    workspaceZh: "折叠工作台与休闲单椅",
    checkInMethodEn: "Front-desk assisted check-in from 3:00 PM.",
    checkInMethodZh: "下午 3 点后可由前台协助办理入住。",
    cancellationTermsEn: "Free cancellation up to 10 days before check-in.",
    cancellationTermsZh: "入住前 10 天可免费取消。",
    longStayTermsEn: "Monthly stays include linen refresh once every 7 nights.",
    longStayTermsZh: "月租入住每 7 晚提供一次布草更换。",
  },
  {
    slug: "bund-studio-a3",
    buildingId: "bund-residences",
    unitNumber: "A3",
    bedroomType: "Studio",
    bedroomCount: 0,
    sizeSqm: 29,
    guestCapacity: 2,
    bathroomCount: 1,
    availableFrom: "2026-07-28",
    floor: 5,
    walkMinutes: 7,
    theme: "ink",
    minimumStay: 1,
    nightlyRate: 118,
    weeklyRate: 710,
    monthlyRate: 2720,
    cleaningFee: 55,
    deposit: 500,
    utilitiesIncluded: true,
    housekeepingFrequency: "Weekly",
    descriptionEn: "Efficient studio with full-height wardrobe storage and a fold-out dining surface for compact city living.",
    descriptionZh: "高效率 studio，配整面衣柜与可折叠餐桌，适合紧凑但完整的城市居住。",
    kitchenFacilitiesEn: "Ceramic hob, microwave, full cookware set, dish rack",
    kitchenFacilitiesZh: "陶瓷炉、微波炉、完整锅具组、沥水架",
    workspaceEn: "Compact desk nook beside the wardrobe wall",
    workspaceZh: "衣柜旁设有紧凑工作角落",
    checkInMethodEn: "Self check-in via digital access card collection locker.",
    checkInMethodZh: "可于数位取卡柜领取门禁卡后自助入住。",
    cancellationTermsEn: "Free cancellation up to 7 days before check-in.",
    cancellationTermsZh: "入住前 7 天可免费取消。",
    longStayTermsEn: "Long stays require one utility usage review each month.",
    longStayTermsZh: "长住每月需进行一次基础能耗确认。",
    unavailableRanges: [{ start: "2026-10-02", end: "2026-10-11" }],
  },
  {
    slug: "bund-studio-a4",
    buildingId: "bund-residences",
    unitNumber: "A4",
    bedroomType: "Studio",
    bedroomCount: 0,
    sizeSqm: 33,
    guestCapacity: 2,
    bathroomCount: 1,
    availableFrom: "2026-07-30",
    floor: 11,
    walkMinutes: 7,
    theme: "sage",
    minimumStay: 1,
    maximumStay: 90,
    nightlyRate: 130,
    weeklyRate: 790,
    monthlyRate: 2980,
    cleaningFee: 65,
    deposit: 600,
    utilitiesIncluded: true,
    housekeepingFrequency: "Twice weekly",
    descriptionEn: "High-floor studio with strong daylight and a clearer separation between sleeping and lounge functions.",
    descriptionZh: "高楼层 studio，采光优秀，睡眠区与休憩区分界更明确。",
    kitchenFacilitiesEn: "Induction hob, toaster oven, fridge-freezer, cookware, rice cooker",
    kitchenFacilitiesZh: "电磁炉、小烤箱、冷冻冷藏冰箱、锅具、电饭煲",
    workspaceEn: "Long working counter with charging points",
    workspaceZh: "长型工作台面，附多组充电插座",
    checkInMethodEn: "Front desk check-in with ID verification.",
    checkInMethodZh: "需持证件于前台办理入住。",
    cancellationTermsEn: "Free cancellation up to 14 days before check-in.",
    cancellationTermsZh: "入住前 14 天可免费取消。",
    longStayTermsEn: "Maximum stay of 90 nights on this unit; extension subject to inspection.",
    longStayTermsZh: "本房最长可住 90 晚，续住需视房况复检结果而定。",
  },
  {
    slug: "bund-onebed-a5",
    buildingId: "bund-residences",
    unitNumber: "A5",
    bedroomType: "1 Bedroom",
    bedroomCount: 1,
    sizeSqm: 41,
    guestCapacity: 3,
    bathroomCount: 1,
    availableFrom: "2026-07-30",
    floor: 4,
    walkMinutes: 7,
    theme: "berry",
    minimumStay: 1,
    nightlyRate: 148,
    weeklyRate: 910,
    monthlyRate: 3450,
    cleaningFee: 75,
    deposit: 750,
    utilitiesIncluded: true,
    housekeepingFrequency: "Weekly",
    descriptionEn: "A one-bedroom apartment facing the internal garden, suited to longer relocations and quiet work routines.",
    descriptionZh: "面向内院花园的一房型公寓，适合较长期搬迁与安静工作生活节奏。",
    kitchenFacilitiesEn: "Full hob, microwave, large fridge, cookware, dining setup for 3",
    kitchenFacilitiesZh: "完整炉台、微波炉、大型冰箱、锅具、3 人餐桌配置",
    workspaceEn: "Separate desk zone in the living room",
    workspaceZh: "客厅独立工作区",
    checkInMethodEn: "Meet-and-greet check-in with building staff.",
    checkInMethodZh: "由楼栋服务人员现场迎宾办理入住。",
    cancellationTermsEn: "Free cancellation up to 10 days before check-in.",
    cancellationTermsZh: "入住前 10 天可免费取消。",
    longStayTermsEn: "Monthly invoices and extension requests handled by on-site operations team.",
    longStayTermsZh: "月租发票与续住申请由现场营运团队处理。",
  },
  {
    slug: "bund-onebed-a6",
    buildingId: "bund-residences",
    unitNumber: "A6",
    bedroomType: "1 Bedroom",
    bedroomCount: 1,
    sizeSqm: 44,
    guestCapacity: 3,
    bathroomCount: 1,
    availableFrom: "2026-09-01",
    floor: 12,
    walkMinutes: 7,
    theme: "coral",
    minimumStay: 1,
    nightlyRate: 152,
    weeklyRate: 940,
    monthlyRate: 3560,
    cleaningFee: 75,
    deposit: 800,
    utilitiesIncluded: true,
    housekeepingFrequency: "Twice weekly",
    descriptionEn: "Corner one-bedroom with added sofa space and stronger privacy for relocation couples or project leads.",
    descriptionZh: "角间一房型，客厅更完整，适合搬迁中的双人住客或项目主管。",
    kitchenFacilitiesEn: "Induction hob, microwave, full-size fridge, cookware, dish set",
    kitchenFacilitiesZh: "电磁炉、微波炉、全尺寸冰箱、锅具与餐具组",
    workspaceEn: "Desk plus side chair in a semi-separated corner",
    workspaceZh: "半独立角落配置书桌与边椅",
    checkInMethodEn: "Smart lock and digital guidebook issued on arrival day.",
    checkInMethodZh: "入住当天发送智慧门锁与电子入住手册。",
    cancellationTermsEn: "Free cancellation up to 14 days before check-in.",
    cancellationTermsZh: "入住前 14 天可免费取消。",
    longStayTermsEn: "Stays over 45 nights include one preventive maintenance visit.",
    longStayTermsZh: "超过 45 晚会安排一次预防性设备保养巡检。",
    unavailableRanges: [{ start: "2026-11-10", end: "2026-11-20" }],
  },
  {
    slug: "bund-twobed-a7",
    buildingId: "bund-residences",
    unitNumber: "A7",
    bedroomType: "2 Bedroom",
    bedroomCount: 2,
    sizeSqm: 58,
    guestCapacity: 4,
    bathroomCount: 1,
    availableFrom: "2026-08-12",
    floor: 9,
    walkMinutes: 7,
    theme: "sand",
    minimumStay: 1,
    maximumStay: 120,
    nightlyRate: 188,
    weeklyRate: 1160,
    monthlyRate: 4280,
    cleaningFee: 90,
    deposit: 1000,
    utilitiesIncluded: true,
    housekeepingFrequency: "Twice weekly",
    descriptionEn: "Two-bedroom serviced apartment designed for small families or colleagues sharing a medium-length project stay.",
    descriptionZh: "双卧 serviced apartment，适合小家庭或同事共同入住的中长期项目住宿。",
    kitchenFacilitiesEn: "Full kitchen, oven, large fridge, cookware, dining set for 4",
    kitchenFacilitiesZh: "完整厨房、烤箱、大冰箱、锅具与 4 人餐桌",
    workspaceEn: "Dedicated work table plus extra dining/work surface",
    workspaceZh: "独立工作桌，另附可兼作工作的餐桌面",
    checkInMethodEn: "Front desk key handover with apartment walk-through.",
    checkInMethodZh: "由前台交钥匙并带看房内设备。",
    cancellationTermsEn: "Free cancellation up to 14 days before check-in.",
    cancellationTermsZh: "入住前 14 天可免费取消。",
    longStayTermsEn: "Family stays require occupant registration for all guests within 24 hours of arrival.",
    longStayTermsZh: "家庭入住需在抵达后 24 小时内完成所有住客登记。",
  },
  {
    slug: "bund-studio-a8",
    buildingId: "bund-residences",
    unitNumber: "A8",
    bedroomType: "Studio",
    bedroomCount: 0,
    sizeSqm: 30,
    guestCapacity: 2,
    bathroomCount: 1,
    availableFrom: "2026-07-29",
    floor: 3,
    walkMinutes: 7,
    theme: "ink",
    minimumStay: 1,
    nightlyRate: 119,
    weeklyRate: 720,
    monthlyRate: 2760,
    cleaningFee: 55,
    deposit: 500,
    utilitiesIncluded: false,
    housekeepingFrequency: "Weekly",
    descriptionEn: "Lower-floor studio with simple circulation and quick access in and out of the building.",
    descriptionZh: "低楼层 studio，动线简单，日常进出大楼更加方便。",
    kitchenFacilitiesEn: "Induction hob, microwave, fridge, cookware, dishware",
    kitchenFacilitiesZh: "电磁炉、微波炉、冰箱、锅具与餐具",
    workspaceEn: "Slim writing desk and window bench",
    workspaceZh: "纤薄书桌与窗边坐榻",
    checkInMethodEn: "Self check-in with coded lock and online passport registration.",
    checkInMethodZh: "智慧密码锁自助入住，并在线完成证件登记。",
    cancellationTermsEn: "Free cancellation up to 7 days before check-in.",
    cancellationTermsZh: "入住前 7 天可免费取消。",
    longStayTermsEn: "Utilities billed separately for stays over 21 nights.",
    longStayTermsZh: "超过 21 晚的入住，水电将另行计费。",
  },
  {
    slug: "lotus-studio-b1",
    buildingId: "lotus-tower",
    unitNumber: "B1",
    bedroomType: "Studio",
    bedroomCount: 0,
    sizeSqm: 32,
    guestCapacity: 2,
    bathroomCount: 1,
    availableFrom: "2026-07-28",
    floor: 7,
    walkMinutes: 9,
    theme: "ink",
    minimumStay: 1,
    nightlyRate: 122,
    weeklyRate: 742,
    monthlyRate: 2840,
    cleaningFee: 60,
    deposit: 520,
    utilitiesIncluded: true,
    housekeepingFrequency: "Weekly",
    descriptionEn: "City-facing studio with darker finishes, generous wardrobe storage, and a focused work corner.",
    descriptionZh: "面向城市街景的 studio，色调较沉稳，衣柜收纳充足，并附专注型工作角落。",
    kitchenFacilitiesEn: "Hob, microwave, fridge, cookware, coffee set",
    kitchenFacilitiesZh: "炉台、微波炉、冰箱、锅具、咖啡冲煮组",
    workspaceEn: "Task desk with ergonomic chair",
    workspaceZh: "配人体工学椅的工作桌",
    checkInMethodEn: "Self check-in with lobby support hotline.",
    checkInMethodZh: "可自助入住，并提供大厅客服热线支援。",
    cancellationTermsEn: "Free cancellation up to 7 days before check-in.",
    cancellationTermsZh: "入住前 7 天可免费取消。",
    longStayTermsEn: "Long stays can request extra storage at no additional charge.",
    longStayTermsZh: "长住可免费申请额外储物空间。",
  },
  {
    slug: "lotus-studio-b2",
    buildingId: "lotus-tower",
    unitNumber: "B2",
    bedroomType: "Studio",
    bedroomCount: 0,
    sizeSqm: 34,
    guestCapacity: 2,
    bathroomCount: 1,
    availableFrom: "2026-07-31",
    floor: 15,
    walkMinutes: 9,
    theme: "coral",
    minimumStay: 1,
    nightlyRate: 128,
    weeklyRate: 780,
    monthlyRate: 2960,
    cleaningFee: 65,
    deposit: 600,
    utilitiesIncluded: true,
    housekeepingFrequency: "Twice weekly",
    descriptionEn: "Higher-floor studio with open skyline exposure and a better-defined dining ledge.",
    descriptionZh: "高楼层 studio，视野较开阔，也有更明确的用餐吧台。",
    kitchenFacilitiesEn: "Induction hob, microwave, fridge-freezer, cookware, kettle",
    kitchenFacilitiesZh: "电磁炉、微波炉、冷冻冷藏冰箱、锅具、电热水壶",
    workspaceEn: "Wall-facing desk with shelves",
    workspaceZh: "靠墙书桌与层架",
    checkInMethodEn: "Front desk verification plus digital door access.",
    checkInMethodZh: "前台验证后提供数位门锁权限。",
    cancellationTermsEn: "Free cancellation up to 10 days before check-in.",
    cancellationTermsZh: "入住前 10 天可免费取消。",
    longStayTermsEn: "Stays over 28 nights include one wardrobe refresh service on request.",
    longStayTermsZh: "入住超过 28 晚可申请一次衣柜整理服务。",
  },
  {
    slug: "lotus-studio-b3",
    buildingId: "lotus-tower",
    unitNumber: "B3",
    bedroomType: "Studio",
    bedroomCount: 0,
    sizeSqm: 31,
    guestCapacity: 2,
    bathroomCount: 1,
    availableFrom: "2026-07-30",
    floor: 9,
    walkMinutes: 9,
    theme: "sand",
    minimumStay: 1,
    nightlyRate: 121,
    weeklyRate: 735,
    monthlyRate: 2815,
    cleaningFee: 60,
    deposit: 500,
    utilitiesIncluded: true,
    housekeepingFrequency: "Weekly",
    descriptionEn: "Calm studio with balanced daylight, concealed laundry cabinet, and simple circulation throughout.",
    descriptionZh: "安静 studio，采光均衡，洗衣设备隐藏于柜体，整体动线流畅。",
    kitchenFacilitiesEn: "Ceramic hob, microwave, fridge, cookware, compact dining set",
    kitchenFacilitiesZh: "陶瓷炉、微波炉、冰箱、锅具、轻量餐桌组",
    workspaceEn: "Console desk with monitor shelf",
    workspaceZh: "玄关式书桌与显示器层架",
    checkInMethodEn: "Contactless arrival with pre-submitted guest registration.",
    checkInMethodZh: "预先提交住客资料后可无接触入住。",
    cancellationTermsEn: "Free cancellation up to 7 days before check-in.",
    cancellationTermsZh: "入住前 7 天可免费取消。",
    longStayTermsEn: "Long stays may schedule additional cleaning at published housekeeping rates.",
    longStayTermsZh: "长住可依公告价格加购额外清洁。",
  },
  {
    slug: "lotus-studio-b4",
    buildingId: "lotus-tower",
    unitNumber: "B4",
    bedroomType: "Studio",
    bedroomCount: 0,
    sizeSqm: 33,
    guestCapacity: 2,
    bathroomCount: 1,
    availableFrom: "2026-07-29",
    floor: 17,
    walkMinutes: 9,
    theme: "sage",
    minimumStay: 1,
    nightlyRate: 129,
    weeklyRate: 788,
    monthlyRate: 2990,
    cleaningFee: 65,
    deposit: 600,
    utilitiesIncluded: true,
    housekeepingFrequency: "Twice weekly",
    descriptionEn: "Clean-lined tower studio with sunset light and a more generous dresser plus wardrobe zone.",
    descriptionZh: "线条俐落的塔楼 studio，傍晚采光佳，梳妆与衣柜区也更宽敞。",
    kitchenFacilitiesEn: "Induction hob, microwave, full cookware, water filter pitcher",
    kitchenFacilitiesZh: "电磁炉、微波炉、完整锅具、滤水壶",
    workspaceEn: "Wide desk under wall art feature",
    workspaceZh: "艺术墙下方的宽工作桌",
    checkInMethodEn: "Reception assisted check-in and luggage hold.",
    checkInMethodZh: "可由柜台协助入住并寄存行李。",
    cancellationTermsEn: "Free cancellation up to 10 days before check-in.",
    cancellationTermsZh: "入住前 10 天可免费取消。",
    longStayTermsEn: "Stays over 60 nights require a supplementary agreement for consumables replacement.",
    longStayTermsZh: "超过 60 晚需签署补充协议说明耗材补给。",
    unavailableRanges: [{ start: "2026-12-20", end: "2027-01-05" }],
  },
  {
    slug: "lotus-onebed-b5",
    buildingId: "lotus-tower",
    unitNumber: "B5",
    bedroomType: "1 Bedroom",
    bedroomCount: 1,
    sizeSqm: 43,
    guestCapacity: 3,
    bathroomCount: 1,
    availableFrom: "2026-08-01",
    floor: 6,
    walkMinutes: 9,
    theme: "berry",
    minimumStay: 1,
    nightlyRate: 150,
    weeklyRate: 925,
    monthlyRate: 3490,
    cleaningFee: 75,
    deposit: 800,
    utilitiesIncluded: true,
    housekeepingFrequency: "Weekly",
    descriptionEn: "One-bedroom city apartment prioritising storage, a separate lounge, and a comfortable medium-stay routine.",
    descriptionZh: "一房型城市公寓，强调收纳、独立客厅与舒适的中长期居住节奏。",
    kitchenFacilitiesEn: "Full hob, microwave, large fridge, cookware, dining table for 3",
    kitchenFacilitiesZh: "完整炉台、微波炉、大冰箱、锅具、3 人餐桌",
    workspaceEn: "Separate desk in the living area",
    workspaceZh: "客厅独立书桌",
    checkInMethodEn: "Meet-and-greet arrival with apartment orientation.",
    checkInMethodZh: "由服务人员迎宾并说明房内设备。",
    cancellationTermsEn: "Free cancellation up to 14 days before check-in.",
    cancellationTermsZh: "入住前 14 天可免费取消。",
    longStayTermsEn: "Monthly stays include one mattress and upholstery refresh service.",
    longStayTermsZh: "月租入住含一次床垫与软装深度整理服务。",
  },
  {
    slug: "lotus-onebed-b6",
    buildingId: "lotus-tower",
    unitNumber: "B6",
    bedroomType: "1 Bedroom",
    bedroomCount: 1,
    sizeSqm: 46,
    guestCapacity: 3,
    bathroomCount: 1,
    availableFrom: "2026-08-20",
    floor: 18,
    walkMinutes: 9,
    theme: "ink",
    minimumStay: 1,
    nightlyRate: 158,
    weeklyRate: 970,
    monthlyRate: 3660,
    cleaningFee: 80,
    deposit: 850,
    utilitiesIncluded: true,
    housekeepingFrequency: "Twice weekly",
    descriptionEn: "Larger corner one-bedroom with a longer kitchen run and stronger natural light throughout the living room.",
    descriptionZh: "较大的角间一房型，厨房台面更长，客厅采光也更完整。",
    kitchenFacilitiesEn: "Induction hob, combi oven, full-size fridge, cookware, coffee machine",
    kitchenFacilitiesZh: "电磁炉、蒸烤箱、全尺寸冰箱、锅具、咖啡机",
    workspaceEn: "Extended desk with secondary laptop perch",
    workspaceZh: "加长工作桌，另附笔电侧台",
    checkInMethodEn: "Digital pre-arrival onboarding plus concierge key handover.",
    checkInMethodZh: "入住前先完成线上说明，现场由礼宾交付钥匙。",
    cancellationTermsEn: "Free cancellation up to 14 days before check-in.",
    cancellationTermsZh: "入住前 14 天可免费取消。",
    longStayTermsEn: "Stays above 45 nights include one preventive HVAC cleaning visit.",
    longStayTermsZh: "超过 45 晚含一次空调滤网预防性清洁。",
  },
  {
    slug: "lotus-twobed-b7",
    buildingId: "lotus-tower",
    unitNumber: "B7",
    bedroomType: "2 Bedroom",
    bedroomCount: 2,
    sizeSqm: 61,
    guestCapacity: 4,
    bathroomCount: 2,
    availableFrom: "2026-08-25",
    floor: 12,
    walkMinutes: 9,
    theme: "coral",
    minimumStay: 1,
    maximumStay: 180,
    nightlyRate: 198,
    weeklyRate: 1225,
    monthlyRate: 4520,
    cleaningFee: 95,
    deposit: 1200,
    utilitiesIncluded: true,
    housekeepingFrequency: "Twice weekly",
    descriptionEn: "Two-bedroom family-friendly serviced apartment with two bathrooms and an operational layout for longer assignments.",
    descriptionZh: "双卧双卫 serviced apartment，适合家庭入住，也适合较长期的外派项目住宿。",
    kitchenFacilitiesEn: "Full kitchen, oven, large fridge, cookware, dining table for 4",
    kitchenFacilitiesZh: "完整厨房、烤箱、大冰箱、锅具与 4 人餐桌",
    workspaceEn: "Dedicated desk in one bedroom and flexible dining workspace",
    workspaceZh: "其中一间卧室设独立书桌，餐桌亦可弹性工作",
    checkInMethodEn: "Staff escort, ID verification, and apartment handover checklist.",
    checkInMethodZh: "由服务人员带领入住，完成证件验证与房况交接。",
    cancellationTermsEn: "Free cancellation up to 21 days before check-in.",
    cancellationTermsZh: "入住前 21 天可免费取消。",
    longStayTermsEn: "Stays over 60 nights require updated occupant list and utility cap review.",
    longStayTermsZh: "超过 60 晚需更新住客名单，并确认水电使用上限。",
  },
];

function formatAvailabilityDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function buildGallery(seed: ListingSeed, locale: Locale): GalleryItem[] {
  const start = Number(seed.unitNumber.charCodeAt(0) + seed.floor) % imagePool.length;
  const ordered = Array.from({ length: imagePool.length }, (_, index) => imagePool[(start + index) % imagePool.length]);
  const labels =
    locale === "zh"
      ? [`${seed.unitNumber} 客厅`, `${seed.unitNumber} 卧室`, `${seed.unitNumber} 厨房`, `${seed.unitNumber} 细节`]
      : [`${seed.unitNumber} living area`, `${seed.unitNumber} bedroom`, `${seed.unitNumber} kitchen`, `${seed.unitNumber} details`];

  return ordered.map((src, index) => ({
    src,
    label: labels[index],
  }));
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return new Date(startA) < new Date(endB) && new Date(startB) < new Date(endA);
}

function isDateRangeAvailable(seed: ListingSeed, stay: StaySearch) {
  if (!stay.checkIn || !stay.checkOut) {
    return true;
  }

  if (stay.checkIn < seed.availableFrom) {
    return false;
  }

  return !(seed.unavailableRanges ?? []).some((range) =>
    rangesOverlap(stay.checkIn!, stay.checkOut!, range.start, range.end)
  );
}

function mapListing(locale: Locale, seed: ListingSeed) {
  const building = buildingContent[locale][seed.buildingId];
  const gallery = buildGallery(seed, locale);
  const isZh = locale === "zh";
  const utilitiesLabel = seed.utilitiesIncluded
    ? isZh
      ? "水电网已包含"
      : "Utilities included"
    : isZh
      ? "水电网另计"
      : "Utilities excluded";
  const washingMachineLabel = isZh ? "洗衣机" : "Washer";
  const wifiLabel = isZh ? "高速 Wi-Fi" : "High-speed Wi-Fi";
  const kitchenLabel = isZh ? "完整厨房" : "Kitchen";
  const workspaceLabel = isZh ? "可工作桌面" : "Workspace";
  const availabilityLabel = isZh
    ? `${formatAvailabilityDate(seed.availableFrom, locale)} 起可入住`
    : `Available from ${formatAvailabilityDate(seed.availableFrom, locale)}`;
  const typeLabel = isZh ? (seed.bedroomType === "Studio" ? "Studio" : seed.bedroomType === "1 Bedroom" ? "一房型" : "两房型") : seed.bedroomType;

  return {
    ...seed,
    title: `${building.name} ${seed.unitNumber}`,
    subtitle: isZh ? seed.descriptionZh : seed.descriptionEn,
    description: isZh ? seed.descriptionZh : seed.descriptionEn,
    buildingName: building.name,
    address: building.address,
    area: building.area,
    walk: building.walk,
    imageLabel: isZh ? `${seed.unitNumber} 实景` : `Unit ${seed.unitNumber} photo`,
    gallery,
    coverImage: gallery[0].src,
    sizeLabel: isZh ? `${seed.sizeSqm} 平米` : `${seed.sizeSqm} sqm`,
    guestCapacityLabel: isZh ? `最多 ${seed.guestCapacity} 人` : `Up to ${seed.guestCapacity} guests`,
    bathroomLabel: isZh ? `${seed.bathroomCount} 间卫浴` : `${seed.bathroomCount} bathroom`,
    floorLabel: isZh ? `${seed.floor} 楼` : `Floor ${seed.floor}`,
    metroLabel: isZh ? `${seed.walkMinutes} 分钟到地铁` : `${seed.walkMinutes} min to metro`,
    availabilityLabel,
    depositLabel: isZh ? `押金 US$${seed.deposit ?? 0}` : `Deposit US$${seed.deposit ?? 0}`,
    utilitiesLabel,
    housekeepingLabel: isZh ? `${seed.housekeepingFrequency === "Weekly" ? "每周一次" : "每周两次"}保洁` : `${seed.housekeepingFrequency} housekeeping`,
    kitchenFacilitiesLabel: isZh ? seed.kitchenFacilitiesZh : seed.kitchenFacilitiesEn,
    workspaceDetail: isZh ? seed.workspaceZh : seed.workspaceEn,
    checkInMethodLabel: isZh ? seed.checkInMethodZh : seed.checkInMethodEn,
    cancellationTermsLabel: isZh ? seed.cancellationTermsZh : seed.cancellationTermsEn,
    longStayTermsLabel: isZh ? seed.longStayTermsZh : seed.longStayTermsEn,
    apartmentTypeLabel: typeLabel,
    amenityHighlights: [kitchenLabel, washingMachineLabel, wifiLabel, utilitiesLabel],
    serviceHighlights: [isZh ? `${seed.housekeepingFrequency === "Weekly" ? "每周" : "每周两次"}保洁` : seed.housekeepingFrequency, workspaceLabel],
  };
}

export type Listing = ReturnType<typeof mapListing>;

export function getBuildings(locale: Locale) {
  return Object.entries(buildingContent[locale]).map(([id, building]) => {
    const buildingListings = listingSeeds.filter((seed) => seed.buildingId === id);
    const minNightly = Math.min(...buildingListings.map((seed) => seed.nightlyRate));
    return {
      id,
      theme: id === "bund-residences" ? "coral" : "ink",
      count: buildingListings.length,
      name: building.name,
      description: building.description,
      area: building.area,
      walk: building.walk,
      range:
        locale === "zh"
          ? `每晚 US$${minNightly} 起`
          : `From US$${minNightly} per night`,
    };
  });
}

export function getAllListings(locale: Locale) {
  return listingSeeds.map((seed) => mapListing(locale, seed));
}

export function getFeaturedListings(locale: Locale) {
  return getAllListings(locale).slice(0, 4);
}

export function searchListings(
  locale: Locale,
  filters: {
    checkIn?: string;
    checkOut?: string;
    rooms?: string;
    guests?: string;
  }
) {
  const nights = getStayNights(filters);
  const requestedRooms = filters.rooms;
  const requestedGuests = filters.guests ? Number(filters.guests) : undefined;

  return getAllListings(locale).filter((listing) => {
    const matchesBedrooms =
      !requestedRooms ||
      (requestedRooms === "studio" ? listing.bedroomCount === 0 : listing.bedroomCount >= Number(requestedRooms));
    const matchesGuests = requestedGuests === undefined || listing.guestCapacity >= requestedGuests;
    const matchesStayLength =
      nights === 0 ||
      (listing.maximumStay === undefined || nights <= listing.maximumStay);
    const matchesAvailability = isDateRangeAvailable(listing, filters);

    return matchesBedrooms && matchesGuests && matchesStayLength && matchesAvailability;
  });
}

export function getListingBySlug(locale: Locale, slug: string) {
  const seed = listingSeeds.find((item) => item.slug === slug);
  return seed ? mapListing(locale, seed) : null;
}

export function getRelatedListings(locale: Locale, currentSlug: string) {
  return getAllListings(locale).filter((listing) => listing.slug !== currentSlug).slice(0, 3);
}

export function getListingPrice(locale: Locale, listing: Listing, stay: StaySearch) {
  return getPriceSummary(listing, locale, stay);
}
