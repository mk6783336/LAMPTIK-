import type { LandingCopy } from "@/lib/i18n/types";

/**
 * Vietnamese platform landings.
 *
 * Vietnamese users search "tải video ... không logo" — "tải" (download) rather
 * than "download", and "không logo" for watermark. Both appear in the copy and
 * in the keywords, since the romanised query is still typed by some.
 */
export const vi: Record<"instagram" | "youtube" | "facebook", LandingCopy> = {
  instagram: {
    code: "vi",
    htmlLang: "vi",
    dir: "ltr",
    title: "Tải Reels Instagram HD — Không Logo",
    description:
      "Tải Reels Instagram chất lượng gốc 1080p kèm âm thanh, không logo và không cần đăng nhập. Miễn phí ngay trên trình duyệt, dùng được cả điện thoại lẫn máy tính.",
    keywords: [
      "tải reels instagram",
      "tải video instagram",
      "cách tải reels instagram",
      "tải reels không logo",
      "lưu video instagram về máy",
      "tải reels hd",
    ],
    eyebrow: "Instagram Reels · miễn phí · không cần tài khoản",
    h1Lead: "Tải Reels Instagram",
    h1Accent: "HD, không logo.",
    lede:
      "Dán liên kết Reel và lưu đúng tệp MP4 mà Instagram gửi cho trình phát của họ — có cả âm thanh, không cần tài khoản, không cần ứng dụng. Hỗ trợ liên kết /reel/, /reels/, /p/, /tv/ và instagr.am.",
    chips: ["Chất lượng gốc", "Giữ nguyên âm thanh", "Không đăng nhập"],
    tool: {
      heading: "Dán liên kết Reel",
      note: "Instagram được nhận diện tự động — TikTok, Facebook và YouTube cũng dùng được.",
    },
    facts: [
      ["Giá", "Miễn phí"],
      ["Tài khoản", "Không cần"],
      ["Độ phân giải", "1080 × 1920"],
      ["Định dạng", "MP4 có âm thanh"],
    ],
    stepsHeading: "Tải một Reel trong ba bước",
    steps: [
      {
        title: "Sao chép liên kết Reel",
        body: "Trong Reel, nhấn ba chấm rồi chọn Sao chép liên kết. Cũng có thể lấy địa chỉ trên thanh địa chỉ của trình duyệt. Đừng dùng nút lưu của ứng dụng: bản đó đã dính logo và cả giao diện.",
      },
      {
        title: "Dán vào ô phía trên",
        body: "Máy chủ mở bài đăng công khai, xem những phiên bản video đang có rồi lấy MP4 progressive có bitrate cao nhất — hình và tiếng đã nằm sẵn trong cùng một tệp.",
      },
      {
        title: "Lưu tệp MP4",
        body: "Nhấn Tải MP4 HD. Trên Android tệp vào thư mục Download; trên iPhone tệp vào Files, sau đó chia sẻ → Lưu video để đưa vào Photos. Độ phân giải vẫn đúng như bản gốc.",
      },
    ],
    faqHeading: "Câu hỏi thường gặp",
    faqs: [
      {
        question: "Bản tải về có còn logo không?",
        answer:
          "Không. Tệp được lấy là bản Instagram gửi cho trình phát của họ, không phải bản sao từ menu chia sẻ. Bản gốc không có lớp phủ nào nên không phải cắt hay che gì cả.",
      },
      {
        question: "Có cần tài khoản Instagram?",
        answer:
          "Không. Bài đăng công khai được xử lý mà không mở phiên: không tên đăng nhập, không mật khẩu, không cookie. Tài khoản riêng tư thì không tải được, và những trang nhận làm được là đang dùng phiên của người khác.",
      },
      {
        question: "Nếu tải thất bại thì sao?",
        answer:
          "Trước hết hãy kiểm tra video có phát được trên Instagram khi chưa đăng nhập không. Nếu phát được mà ở đây lỗi, đợi một phút rồi thử lại — Instagram chặn bớt yêu cầu ẩn danh khi lưu lượng cao. Bài đã xoá hoặc để riêng tư thì không có tệp công khai.",
      },
      {
        question: "Có hỗ trợ ảnh và carousel?",
        answer:
          "Video nằm trong carousel được tải về dạng MP4. Bài chỉ có ảnh thì không có video, và trang này nói rõ điều đó thay vì trả về tệp rỗng.",
      },
    ],
    cta: {
      heading: "Lưu Reel tiếp theo ở chất lượng gốc",
      body: "Không tài khoản, không ứng dụng, không logo — chỉ là tệp của người tạo.",
      button: "Mở công cụ tải",
    },
    otherToolsHeading: "Công cụ cho nền tảng khác",
    footerNote: "Trang này viết bằng tiếng Việt và hoạt động như nhau ở mọi quốc gia.",
  },

  youtube: {
    code: "vi",
    htmlLang: "vi",
    dir: "ltr",
    title: "Tải Video YouTube MP4 HD hoặc MP3",
    description:
      "Dán liên kết YouTube để tải video MP4 tới 1080p hoặc chỉ lấy âm thanh thành MP3. Hỗ trợ watch, Shorts, youtu.be và danh sách phát, không cần cài ứng dụng.",
    keywords: [
      "tải video youtube",
      "cách tải video youtube",
      "tải nhạc youtube mp3",
      "tải video youtube hd",
      "tải shorts youtube",
      "tải video youtube không cần app",
    ],
    eyebrow: "YouTube · MP4 và MP3 · không cần cài",
    h1Lead: "Tải video YouTube",
    h1Accent: "MP4 HD hoặc chỉ âm thanh.",
    lede:
      "Dán liên kết rồi chọn đúng mức chất lượng đang có: 1080p nếu có, 720p nếu không, hoặc MP3 từ track âm thanh gốc. Tất cả chạy trong trình duyệt, không cần ứng dụng.",
    chips: ["MP4 1080p", "MP3 gốc", "Shorts và youtu.be"],
    tool: {
      heading: "Dán liên kết video",
      note: "YouTube được nhận diện tự động — TikTok, Instagram và Facebook cũng dùng được.",
    },
    facts: [
      ["Giá", "Miễn phí"],
      ["Tài khoản", "Không cần"],
      ["Chất lượng", "1080p / 720p"],
      ["Định dạng", "MP4 và MP3"],
    ],
    stepsHeading: "Tải video YouTube trong ba bước",
    steps: [
      {
        title: "Sao chép liên kết video",
        body: "Trong ứng dụng nhấn Chia sẻ → Sao chép liên kết; trên máy tính sao chép địa chỉ trên thanh địa chỉ. Liên kết youtu.be, Shorts và liên kết có tham số danh sách phát đều được nhận nguyên trạng.",
      },
      {
        title: "Xem chất lượng thực tế",
        body: "Máy chủ hỏi các phiên bản đang có và hiển thị đúng những gì tồn tại. Chúng tôi không tạo ra 4K không có thật, cũng không phóng 720p rồi gọi là HD.",
      },
      {
        title: "Chọn MP4 hoặc MP3",
        body: "Tải cả video lẫn âm thanh, hoặc chỉ lấy track tiếng dưới dạng MP3. Tệp được lưu bằng tên video chứ không phải tên chung chung.",
      },
    ],
    faqHeading: "Câu hỏi thường gặp",
    faqs: [
      {
        question: "Có lấy được 1080p không?",
        answer:
          "Có, nếu YouTube cung cấp độ phân giải đó cho video ấy. Các lựa chọn hiện ra trước khi tải, nên kết quả không nhỏ hơn mức bạn thấy.",
      },
      {
        question: "Làm sao chuyển sang MP3?",
        answer:
          "Dán liên kết rồi chọn lựa chọn âm thanh. Track do YouTube phát hành được chuyển một lần sang MP3; không ghi âm trình phát và không dựng lại âm thanh. Chất lượng theo đúng bản gốc.",
      },
      {
        question: "Shorts và youtu.be có được không?",
        answer:
          "Cả hai đều được. Shorts xử lý như video dọc bình thường, còn liên kết ngắn youtu.be được mở rộng trên máy chủ.",
      },
      {
        question: "Tải cả danh sách phát?",
        answer:
          "Danh sách phát là một danh mục, không phải một tệp. Trang này mở danh mục và bạn tải từng video bằng cùng công cụ; xin hàng trăm video một lúc là cách nhanh nhất để bị giới hạn.",
      },
    ],
    cta: {
      heading: "Lưu video hoặc chỉ phần âm thanh",
      body: "Chọn đúng chất lượng đang có, không phải cài thêm gì.",
      button: "Mở công cụ tải",
    },
    otherToolsHeading: "Công cụ cho nền tảng khác",
    footerNote: "Chỉ tải nội dung của bạn hoặc nội dung bạn được phép; bản quyền vẫn thuộc về người tạo.",
  },

  facebook: {
    code: "vi",
    htmlLang: "vi",
    dir: "ltr",
    title: "Tải Video Facebook HD — Không Cần Ứng Dụng",
    description:
      "Tải video Facebook chất lượng HD ngay trên trình duyệt: bài của trang, Watch, Reels và liên kết fb.watch. Không cài đặt, không tài khoản, không logo.",
    keywords: [
      "tải video facebook",
      "cách tải video facebook",
      "tải video facebook hd",
      "tải reels facebook",
      "fb.watch tải video",
      "lưu video facebook về máy",
    ],
    eyebrow: "Facebook · HD · không cần cài",
    h1Lead: "Tải video Facebook",
    h1Accent: "HD, không cần ứng dụng.",
    lede:
      "Dán liên kết và lưu MP4 kèm âm thanh. Bài của trang, video Watch, Reels và liên kết ngắn fb.watch đều dùng được; liên kết ngắn được mở rộng trên máy chủ trước khi tìm tệp.",
    chips: ["Ưu tiên HD", "Hỗ trợ fb.watch", "Video dài"],
    tool: {
      heading: "Dán liên kết video",
      note: "Facebook được nhận diện tự động — TikTok, Instagram và YouTube cũng dùng được.",
    },
    facts: [
      ["Giá", "Miễn phí"],
      ["Tài khoản", "Không cần"],
      ["Chất lượng", "HD hoặc SD thực"],
      ["Giới hạn", "Không giới hạn dung lượng"],
    ],
    stepsHeading: "Tải video Facebook trong ba bước",
    steps: [
      {
        title: "Sao chép liên kết video",
        body: "Nhấn Chia sẻ dưới video rồi chọn Sao chép liên kết. URL bài đăng, /watch/, /reel/ và dạng ngắn fb.watch/ đều được nhận. Video riêng tư và nhóm kín không có tệp công khai.",
      },
      {
        title: "Để máy chủ đi hết chuyển hướng",
        body: "fb.watch không chứa ID video; đó là liên kết rút gọn nhảy tới bài gốc. Máy chủ đi hết chuỗi chuyển hướng tới URL chuẩn rồi mới kiểm tra hình và tiếng.",
      },
      {
        title: "Chọn HD và lưu",
        body: "Nếu Facebook có bản HD thì bản đó được gửi đi; nếu không, SD tốt nhất, và bảng kết quả ghi rõ đã nhận bản nào. Video Watch dài được truyền thẳng mà không đệm trên máy chủ, nên tệp 1 GB cũng tải như một clip ngắn.",
      },
    ],
    faqHeading: "Câu hỏi thường gặp",
    faqs: [
      {
        question: "Có phải cài ứng dụng hay tiện ích?",
        answer:
          "Không. Mọi thứ chạy trong trình duyệt, trên iPhone, Android, Windows hay Mac: không APK, không tiện ích, không quyền truy cập. Đây là khác biệt với những trang đòi cài đặt trước khi cho tệp.",
      },
      {
        question: "Liên kết fb.watch có chạy không?",
        answer:
          "Có. Đó là liên kết rút gọn chứ không phải địa chỉ video, nên chuỗi chuyển hướng được đi hết trên máy chủ để tới bài gốc. Vì vậy những liên kết mà công cụ khác báo \"không hợp lệ\" vẫn chạy ở đây.",
      },
      {
        question: "Sao có lúc chỉ ra SD?",
        answer:
          "Vì Facebook không phát hành bản HD cho video đó. Chúng tôi hỏi HD trước rồi dùng SD tốt nhất, và bảng kết quả nói rõ bản nào được gửi thay vì gọi 360p là HD.",
      },
      {
        question: "Video riêng tư hoặc trong nhóm?",
        answer:
          "Không. Những video đó cần phiên có quyền xem, và công cụ này không bao giờ hỏi thông tin đăng nhập Facebook. Bài của trang công khai, Watch công khai và Reels công khai thì được.",
      },
    ],
    cta: {
      heading: "Lưu video trước khi nó biến mất",
      body: "Không tài khoản, không cài đặt và không giới hạn dung lượng.",
      button: "Mở công cụ tải",
    },
    otherToolsHeading: "Công cụ cho nền tảng khác",
    footerNote: "Video riêng tư và nhóm kín không được hỗ trợ có chủ đích: không có tệp công khai để tải.",
  },
};
