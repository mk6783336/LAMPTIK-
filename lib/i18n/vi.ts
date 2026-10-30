import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Vietnamese landing page — Vietnam.
 *
 * Vietnam is consistently one of the top countries for TikTok downloader
 * demand, and the query is phrased "tải video tiktok không watermark" — with
 * "tải" rather than "download", and "không watermark" rather than "không logo".
 * The copy follows that phrasing instead of translating the English page, and
 * the diacritics are written properly: Vietnamese without tone marks reads as
 * broken text to a native speaker and is a poor relevance signal.
 */
export const vi: LandingCopy = {
  code: "vi",
  htmlLang: "vi",
  dir: "ltr",
  title: "Tải video TikTok không watermark HD 1080p",
  description:
    "Tải video TikTok, Instagram Reels, Facebook và YouTube không watermark, chất lượng HD 1080p. Miễn phí, không cần ứng dụng, không cần đăng ký.",
  keywords: [
    "tải video tiktok không watermark",
    "tải video tiktok không logo",
    "cách tải video tiktok",
    "tải video tiktok về điện thoại",
    "tiktok sang mp3",
    "tải reels instagram",
    "tải video facebook",
    "tải video youtube mp4",
  ],
  eyebrow: "Miễn phí · Không cần app · Không watermark",
  h1Lead: "Tải mọi video.",
  h1Accent: "Chất lượng HD trọn vẹn.",
  lede:
    "Dán liên kết và lưu tệp gốc trong vài giây — không watermark, không tài khoản, ngay trên trình duyệt điện thoại Android hoặc iPhone. Không cần cài ứng dụng và không có quảng cáo nào che nút tải.",
  chips: ["HD 1080p", "Không watermark", "Âm thanh MP3"],
  tool: {
    heading: "Công cụ tải xuống",
    note: "Dán liên kết TikTok, Instagram, Facebook hoặc YouTube ở trên.",
  },
  facts: [
    ["Giá", "Hoàn toàn miễn phí"],
    ["Tài khoản", "Không cần"],
    ["Chất lượng", "1080p HD"],
    ["Nền tảng", "TikTok, Instagram, Facebook"],
  ],
  stepsHeading: "Tải video trong ba bước",
  steps: [
    {
      title: "Sao chép liên kết video",
      body: "Mở video trong ứng dụng TikTok, Instagram, Facebook hoặc YouTube, nhấn Chia sẻ rồi chọn Sao chép liên kết. Liên kết rút gọn như vt.tiktok.com, vm.tiktok.com và fb.watch cũng dán được trực tiếp — không cần mở trình duyệt trước.",
    },
    {
      title: "Dán liên kết vào công cụ",
      body: "Trang tự nhận diện nền tảng, đi theo chuyển hướng của liên kết rút gọn, rồi yêu cầu máy chủ nền tảng trả về bản gốc — không phải bản đã bị ứng dụng đóng logo. Tệp được kiểm tra để chắc chắn đó là video trước khi nút tải hiện ra.",
    },
    {
      title: "Chọn chất lượng và lưu",
      body: "Nhấn Tải MP4 HD, MP4 SD hoặc MP3. Tệp được lưu với tên gốc trong thư mục Tải xuống, nên thư viện vẫn gọn và dễ tìm lại. Trên iPhone, tệp vào ứng dụng Tệp và chuyển sang Ảnh bằng Chia sẻ → Lưu video.",
    },
  ],
  faqHeading: "Câu hỏi thường gặp",
  faqs: [
    {
      question: "Có thật sự miễn phí không?",
      answer:
        "Có, mọi lượt tải đều miễn phí và không giới hạn — cả HD và MP3 — không thuê bao, không thẻ, không giới hạn số lượng mỗi ngày. Trang được duy trì bằng quảng cáo chứ không bằng thuê bao, nên sẽ không có hoá đơn nào xuất hiện sau đó.",
    },
    {
      question: "Tôi có phải cài ứng dụng không?",
      answer:
        "Không. Công cụ chạy trực tiếp trên trình duyệt Android, iPhone và máy tính. Không ứng dụng, không hồ sơ cài đặt, không tài khoản — chỉ một ô dán liên kết, nên vẫn hoạt động sau mỗi lần cập nhật iOS hay Android.",
    },
    {
      question: "Vì sao tải được video không watermark?",
      answer:
        "Chúng tôi yêu cầu máy chủ nền tảng trả về bản gốc sạch, thay vì bản đã bị ứng dụng đóng logo. Nhờ vậy không phải cắt hay làm mờ hình, và video giữ nguyên khung hình đến tận mép.",
    },
    {
      question: "Liên kết và video của tôi có bị lưu trên máy chủ không?",
      answer:
        "Không. Chúng tôi không lưu tệp và không lưu lịch sử liên kết. Quá trình tải đi từ máy chủ nền tảng thẳng tới thiết bị của bạn, và bản duy nhất nằm trong bộ nhớ máy bạn.",
    },
    {
      question: "Có tải được video riêng tư hoặc nội dung trả phí không?",
      answer:
        "Không. Chỉ video công khai. Video của tài khoản riêng tư, nội dung trả phí và livestream không tải được — đó là giới hạn của nền tảng, không phải thiếu sót của công cụ. Tôn trọng giới hạn đó cũng là điều giữ cho trang này còn hoạt động.",
    },
    {
      question: "Nếu tôi chỉ cần âm thanh thì sao?",
      answer:
        "Chọn MP3. Nếu chỉ có M4A, tệp đó vẫn là âm thanh gốc của nền tảng nên chất lượng tốt hơn so với chuyển mã lại lần nữa. Đây là cách gọn nhất để lưu một đoạn nhạc nền hay âm thanh đang thịnh hành trước khi video gốc bị xoá.",
    },
  ],
  cta: {
    heading: "Bắt đầu tải ngay",
    body: "Dán liên kết đầu tiên và lưu bản sạch chất lượng cao — không đăng ký, không chờ đợi.",
    button: "Quay lại công cụ",
  },
  otherToolsHeading: "Công cụ khác bằng tiếng Anh",
  footerNote: "Trang này bằng tiếng Việt; công cụ theo từng nền tảng dùng tiếng Anh.",
};
