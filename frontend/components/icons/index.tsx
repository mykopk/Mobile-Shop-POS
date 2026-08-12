import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps, children: ReactNode) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.1061 22H10.8939C7.44737 22 5.72409 22 4.54903 20.9882C3.37396 19.9764 3.13025 18.2827 2.64284 14.8952L2.36407 12.9579C1.98463 10.3208 1.79491 9.00229 2.33537 7.87495C2.87583 6.7476 4.02619 6.06234 6.32691 4.69181L7.71175 3.86687C9.80104 2.62229 10.8457 2 12 2C13.1543 2 14.199 2.62229 16.2882 3.86687L17.6731 4.69181C19.9738 6.06234 21.1242 6.7476 21.6646 7.87495C22.2051 9.00229 22.0154 10.3208 21.6359 12.9579L21.3572 14.8952C20.8697 18.2827 20.626 19.9764 19.451 20.9882C18.2759 22 16.5526 22 13.1061 22ZM8.39757 15.5532C8.64423 15.2204 9.11395 15.1506 9.44671 15.3973C10.1751 15.9371 11.0542 16.2498 12.0001 16.2498C12.946 16.2498 13.8251 15.9371 14.5535 15.3973C14.8863 15.1506 15.356 15.2204 15.6026 15.5532C15.8493 15.8859 15.7795 16.3557 15.4467 16.6023C14.4743 17.3231 13.2851 17.7498 12.0001 17.7498C10.7151 17.7498 9.5259 17.3231 8.55349 16.6023C8.22072 16.3557 8.15092 15.8859 8.39757 15.5532Z"
      />
    </svg>
  );
}

export function PosIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path d="M8.41799 3.25089C8.69867 2.65917 9.30155 2.25 10 2.25H14C14.6984 2.25 15.3013 2.65917 15.582 3.25089C16.2655 3.25586 16.7983 3.28724 17.2738 3.47309C17.842 3.69516 18.3362 4.07266 18.6999 4.56242C19.0668 5.0565 19.2391 5.68979 19.4762 6.56144L19.5132 6.69747L19.515 6.70412L20.3886 10.0282L20.4005 10.0107C20.4428 10.0563 20.4833 10.104 20.5222 10.1539C21.4231 11.3076 20.9941 13.0235 20.1362 16.4553C20.058 16.7679 19.9854 17.0582 19.9161 17.3279L17.4386 14.3549L19.2692 11.67L18.7641 9.74813L16.4401 13.1567L12.9763 9.00012H14.3153C16.209 9.00012 17.5959 9.00012 18.614 9.17713L18.0651 7.08876C17.7749 6.02451 17.6716 5.69364 17.4957 5.45674C17.2998 5.19303 17.0337 4.98976 16.7278 4.87018C16.508 4.78427 16.2424 4.759 15.5805 4.75231C15.2992 5.3423 14.6972 5.75 14 5.75H10C9.30281 5.75 8.70084 5.3423 8.41951 4.75231C7.75763 4.759 7.49204 4.78427 7.27224 4.87018C6.96629 4.98976 6.70018 5.19303 6.50433 5.45674C6.3284 5.69363 6.22509 6.02451 5.93489 7.08874L5.38601 9.17711C6.40415 9.00012 7.79095 9.00012 9.68462 9.00012H11.0237L7.55993 13.1567L5.23593 9.74813L4.73082 11.67L6.56142 14.3549L4.08384 17.328C4.01449 17.0582 3.94192 16.768 3.86376 16.4553C3.00581 13.0235 2.57684 11.3076 3.47767 10.1539C3.51661 10.104 3.55717 10.0563 3.59943 10.0106L3.61139 10.0282L4.48503 6.70412L4.48681 6.69746L4.52384 6.56145C4.76091 5.6898 4.93316 5.0565 5.30009 4.56242C5.66381 4.07266 6.15802 3.69516 6.72621 3.4731C7.20175 3.28724 7.73447 3.25586 8.41799 3.25089Z" />
      <path d="M4.60211 19.0491C4.83486 19.6426 5.10205 20.0571 5.49605 20.3647C6.30983 21.0001 7.43476 21.0001 9.68462 21.0001H11.0923L7.44007 15.6436L4.60211 19.0491Z" />
      <path d="M12.9077 21.0001H14.3153C16.5652 21.0001 17.6901 21.0001 18.5039 20.3647C18.8979 20.0571 19.1651 19.6426 19.3978 19.0491L16.5599 15.6436L12.9077 21.0001Z" />
      <path d="M12 19.6688L8.43858 14.4454L12 10.1717L15.5614 14.4454L12 19.6688Z" />
    </svg>
  );
}

export function PurchasesIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path d="M22.0001 8.5C22.0001 11.76 19.6001 14.45 16.4801 14.92V14.86C16.1701 10.98 13.0201 7.83 9.11008 7.52H9.08008C9.55008 4.4 12.2401 2 15.5001 2C19.0901 2 22.0001 4.91 22.0001 8.5Z" />
      <path d="M14.98 14.98C14.73 11.81 12.19 9.27 9.02 9.02C8.85 9.01 8.67 9 8.5 9C4.91 9 2 11.91 2 15.5C2 19.09 4.91 22 8.5 22C12.09 22 15 19.09 15 15.5C15 15.33 14.99 15.15 14.98 14.98ZM9.38 16.38L8.5 18L7.62 16.38L6 15.5L7.62 14.62L8.5 13L9.38 14.62L11 15.5L9.38 16.38Z" />
    </svg>
  );
}

export function ReturnsIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
    </svg>
  );
}

export function InventoryIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path d="M17.5777 4.43152L15.5777 3.38197C13.8221 2.46066 12.9443 2 12 2C11.0557 2 10.1779 2.46066 8.42229 3.38197L8.10057 3.5508L17.0236 8.64967L21.0403 6.64132C20.3941 5.90949 19.3515 5.36234 17.5777 4.43152Z" />
      <path d="M21.7484 7.96434L17.75 9.96353V13C17.75 13.4142 17.4142 13.75 17 13.75C16.5858 13.75 16.25 13.4142 16.25 13V10.7135L12.75 12.4635V21.904C13.4679 21.7252 14.2848 21.2965 15.5777 20.618L17.5777 19.5685C19.7294 18.4393 20.8052 17.8748 21.4026 16.8603C22 15.8458 22 14.5833 22 12.0585V11.9415C22 10.0489 22 8.86557 21.7484 7.96434Z" />
      <path d="M11.25 21.904V12.4635L2.25164 7.96434C2 8.86557 2 10.0489 2 11.9415V12.0585C2 14.5833 2 15.8458 2.5974 16.8603C3.19479 17.8748 4.27062 18.4393 6.42228 19.5685L8.42229 20.618C9.71524 21.2965 10.5321 21.7252 11.25 21.904Z" />
      <path d="M2.95969 6.64132L12 11.1615L15.4112 9.4559L6.52456 4.37785L6.42229 4.43152C4.64855 5.36234 3.6059 5.90949 2.95969 6.64132Z" />
    </svg>
  );
}

export function ProductsIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.93417 2C9.95604 2 9.97799 2 10 2L14.0658 2C14.9523 1.99995 15.7161 1.99991 16.3278 2.08215C16.9833 2.17028 17.6117 2.36902 18.1213 2.87868C18.631 3.38835 18.8297 4.0167 18.9179 4.67221C19.0001 5.28387 19.0001 6.04769 19 6.93417V17.0658C19.0001 17.9523 19.0001 18.7161 18.9179 19.3278C18.8297 19.9833 18.631 20.6117 18.1213 21.1213C17.6117 21.631 16.9833 21.8297 16.3278 21.9179C15.7161 22.0001 14.9523 22.0001 14.0658 22H9.9342C9.0477 22.0001 8.28388 22.0001 7.67221 21.9179C7.0167 21.8297 6.38835 21.631 5.87868 21.1213C5.36902 20.6117 5.17028 19.9833 5.08215 19.3278C4.99991 18.7161 4.99995 17.9523 5 17.0658L5 7C5 6.97799 5 6.95604 5 6.93417C4.99995 6.04769 4.99991 5.28387 5.08215 4.67221C5.17028 4.0167 5.36902 3.38835 5.87868 2.87868C6.38835 2.36902 7.0167 2.17028 7.67221 2.08215C8.28387 1.99991 9.04769 1.99995 9.93417 2ZM10.5 18C10.5 17.4477 10.9477 17 11.5 17H12.5C13.0523 17 13.5 17.4477 13.5 18C13.5 18.5523 13.0523 19 12.5 19H11.5C10.9477 19 10.5 18.5523 10.5 18Z"
      />
    </svg>
  );
}

export function ContactsIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <circle cx="12" cy="6" r="4" />
      <path d="M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13C16.4183 13 20 15.0147 20 17.5Z" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return base(props, (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ));
}

export function UsersIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <circle cx="9" cy="7" r="3.5" />
      <path d="M2 20c0-2.8 3.1-4.5 7-4.5s7 1.7 7 4.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 15.8c2.8.3 4.5 1.6 4.5 3.7v.5" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return base(props, (
    <>
      <rect x="4" y="10.5" width="16" height="11" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      <path d="M12 15v2.5" />
    </>
  ));
}

export function ReportsIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 -0.5 25 25"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path d="M15.5 7.75C15.0858 7.75 14.75 8.08579 14.75 8.5C14.75 8.91421 15.0858 9.25 15.5 9.25V7.75ZM19.5 9.25C19.9142 9.25 20.25 8.91421 20.25 8.5C20.25 8.08579 19.9142 7.75 19.5 7.75V9.25ZM20.25 8.5C20.25 8.08579 19.9142 7.75 19.5 7.75C19.0858 7.75 18.75 8.08579 18.75 8.5H20.25ZM18.75 12.5C18.75 12.9142 19.0858 13.25 19.5 13.25C19.9142 13.25 20.25 12.9142 20.25 12.5H18.75ZM20.0303 9.03033C20.3232 8.73744 20.3232 8.26256 20.0303 7.96967C19.7374 7.67678 19.2626 7.67678 18.9697 7.96967L20.0303 9.03033ZM12.5 15.5L11.9697 16.0303C12.2626 16.3232 12.7374 16.3232 13.0303 16.0303L12.5 15.5ZM9.5 12.5L10.0303 11.9697C9.73744 11.6768 9.26256 11.6768 8.96967 11.9697L9.5 12.5ZM4.96967 15.9697C4.67678 16.2626 4.67678 16.7374 4.96967 17.0303C5.26256 17.3232 5.73744 17.3232 6.03033 17.0303L4.96967 15.9697ZM15.5 9.25H19.5V7.75H15.5V9.25ZM18.75 8.5V12.5H20.25V8.5H18.75ZM18.9697 7.96967L11.9697 14.9697L13.0303 16.0303L20.0303 9.03033L18.9697 7.96967ZM13.0303 14.9697L10.0303 11.9697L8.96967 13.0303L11.9697 16.0303L13.0303 14.9697ZM8.96967 11.9697L4.96967 15.9697L6.03033 17.0303L10.0303 13.0303L8.96967 11.9697Z" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM7.67 5.5C7.67 5.09 8.01 4.75 8.42 4.75C8.83 4.75 9.17 5.09 9.17 5.5V9.4C9.17 9.81 8.83 10.15 8.42 10.15C8.01 10.15 7.67 9.81 7.67 9.4V5.5ZM9.52282 16.4313C9.31938 16.5216 9.17 16.7132 9.17 16.9358V18.5C9.17 18.91 8.83 19.25 8.42 19.25C8.01 19.25 7.67 18.91 7.67 18.5V16.9358C7.67 16.7132 7.5206 16.5216 7.31723 16.4311C6.36275 16.0064 5.7 15.058 5.7 13.95C5.7 12.45 6.92 11.22 8.42 11.22C9.92 11.22 11.15 12.44 11.15 13.95C11.15 15.0582 10.4791 16.0066 9.52282 16.4313ZM16.33 18.5C16.33 18.91 15.99 19.25 15.58 19.25C15.17 19.25 14.83 18.91 14.83 18.5V14.6C14.83 14.19 15.17 13.85 15.58 13.85C15.99 13.85 16.33 14.19 16.33 14.6V18.5ZM15.58 12.77C14.08 12.77 12.85 11.55 12.85 10.04C12.85 8.93185 13.5209 7.98342 14.4772 7.55873C14.6806 7.46839 14.83 7.27681 14.83 7.05421V5.5C14.83 5.09 15.17 4.75 15.58 4.75C15.99 4.75 16.33 5.09 16.33 5.5V7.06421C16.33 7.28681 16.4794 7.47835 16.6828 7.56885C17.6372 7.9936 18.3 8.94195 18.3 10.05C18.3 11.55 17.08 12.77 15.58 12.77Z" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.77778 21H14.2222C17.3433 21 18.9038 21 20.0248 20.2646C20.51 19.9462 20.9267 19.5371 21.251 19.0607C22 17.9601 22 16.4279 22 13.3636C22 10.2994 22 8.76721 21.251 7.6666C20.9267 7.19014 20.51 6.78104 20.0248 6.46268C19.3044 5.99013 18.4027 5.82123 17.022 5.76086C16.3631 5.76086 15.7959 5.27068 15.6667 4.63636C15.4728 3.68489 14.6219 3 13.6337 3H10.3663C9.37805 3 8.52715 3.68489 8.33333 4.63636C8.20412 5.27068 7.63685 5.76086 6.978 5.76086C5.59733 5.82123 4.69555 5.99013 3.97524 6.46268C3.48995 6.78104 3.07328 7.19014 2.74902 7.6666C2 8.76721 2 10.2994 2 13.3636C2 16.4279 2 17.9601 2.74902 19.0607C3.07328 19.5371 3.48995 19.9462 3.97524 20.2646C5.09624 21 6.65675 21 9.77778 21ZM12 9.27273C9.69881 9.27273 7.83333 11.1043 7.83333 13.3636C7.83333 15.623 9.69881 17.4545 12 17.4545C14.3012 17.4545 16.1667 15.623 16.1667 13.3636C16.1667 11.1043 14.3012 9.27273 12 9.27273ZM12 10.9091C10.6193 10.9091 9.5 12.008 9.5 13.3636C9.5 14.7192 10.6193 15.8182 12 15.8182C13.3807 15.8182 14.5 14.7192 14.5 13.3636C14.5 12.008 13.3807 10.9091 12 10.9091ZM16.7222 10.0909C16.7222 9.63904 17.0953 9.27273 17.5556 9.27273H18.6667C19.1269 9.27273 19.5 9.63904 19.5 10.0909C19.5 10.5428 19.1269 10.9091 18.6667 10.9091H17.5556C17.0953 10.9091 16.7222 10.5428 16.7222 10.0909Z"
      />
    </svg>
  );
}

export function SmartphoneIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path d="M16.24 2H7.76C5 2 4 3 4 5.81V18.19C4 21 5 22 7.76 22H16.23C19 22 20 21 20 18.19V5.81C20 3 19 2 16.24 2ZM12 19.3C11.04 19.3 10.25 18.51 10.25 17.55C10.25 16.59 11.04 15.8 12 15.8C12.96 15.8 13.75 16.59 13.75 17.55C13.75 18.51 12.96 19.3 12 19.3ZM14 6.25H10C9.59 6.25 9.25 5.91 9.25 5.5C9.25 5.09 9.59 4.75 10 4.75H14C14.41 4.75 14.75 5.09 14.75 5.5C14.75 5.91 14.41 6.25 14 6.25Z" />
    </svg>
  );
}

export function HeadphonesIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path d="M20,11.9425 C20,7.56202 16.4243,4 12,4 C7.57567,4 4,7.56202 4,11.9425 C4,13.1324 4.14659,13.8984 4.32843,14.4585 C4.44951,14.8313 4.74118,14.4643 4.88468,14.3297 C5.8667,13.4083 7.4021,13.4302 8.35736,14.3794 C9.77816,15.791 11.0886,17.749 9.27806,19.549 C8.30609,20.5154 6.84226,20.9173 5.72834,19.8765 C4.29036,18.5328 3.04086,16.9692 2.42619,15.0761 C2.169,14.284 2,13.3049 2,11.9425 C2,6.44539 6.4832,2 12,2 C17.5168,2 22,6.44539 22,11.9425 C22,13.3049 21.831,14.284 21.5738,15.0761 C20.9591,16.9692 19.7096,18.5328 18.2717,19.8765 C17.1577,20.9173 15.6939,20.5154 14.7219,19.549 C12.9114,17.749 14.2218,15.791 15.6426,14.3794 C16.5979,13.4302 18.1333,13.4083 19.1153,14.3297 C19.3925,14.5898 19.5286,14.8989 19.6716,14.4585 C19.8534,13.8984 20,13.1324 20,11.9425 Z" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M3 5h18" />
      <path d="M6 12h12" />
      <path d="M9 19h6" />
      <circle cx="6" cy="5" r="2" />
      <circle cx="14" cy="12" r="2" />
      <circle cx="18" cy="19" r="2" />
    </>
  ));
}

export function LogoutIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ));
}

export function PlusIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ));
}

export function PhoneIcon(props: IconProps) {
  return base(props, (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10 18.5h4" />
    </>
  ));
}

export function TagIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M12.6 2.6 20 4l1.4 7.4-8 8a2 2 0 0 1-2.8 0L2.6 11.4a2 2 0 0 1 0-2.8z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </>
  ));
}

export function SearchIcon(props: IconProps) {
  return base(props, (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ));
}

export function WalletIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.1009 8.00353C21.0442 7.99996 20.9825 7.99998 20.9186 8L20.9026 8.00001H18.3941C16.3264 8.00001 14.5572 9.62757 14.5572 11.75C14.5572 13.8724 16.3264 15.5 18.3941 15.5H20.9026L20.9186 15.5C20.9825 15.5 21.0442 15.5001 21.1009 15.4965C21.9408 15.4434 22.6835 14.7862 22.746 13.8682C22.7501 13.808 22.75 13.7431 22.75 13.683L22.75 13.6667V9.83334L22.75 9.81702C22.75 9.75688 22.7501 9.69199 22.746 9.6318C22.6835 8.71381 21.9408 8.05657 21.1009 8.00353ZM18.1717 12.75C18.704 12.75 19.1355 12.3023 19.1355 11.75C19.1355 11.1977 18.704 10.75 18.1717 10.75C17.6394 10.75 17.2078 11.1977 17.2078 11.75C17.2078 12.3023 17.6394 12.75 18.1717 12.75Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.9179 17C21.067 16.9961 21.1799 17.1342 21.1394 17.2778C20.9387 17.9902 20.62 18.5975 20.1088 19.1088C19.3604 19.8571 18.4114 20.1892 17.239 20.3469C16.0998 20.5 14.6442 20.5 12.8064 20.5H10.6936C8.85583 20.5 7.40019 20.5 6.26098 20.3469C5.08856 20.1892 4.13961 19.8571 3.39124 19.1088C2.64288 18.3604 2.31076 17.4114 2.15314 16.239C1.99997 15.0998 1.99998 13.6442 2 11.8064V11.6936C1.99998 9.85583 1.99997 8.40019 2.15314 7.26098C2.31076 6.08856 2.64288 5.13961 3.39124 4.39124C4.13961 3.64288 5.08856 3.31076 6.26098 3.15314C7.40019 2.99997 8.85582 2.99998 10.6936 3L12.8064 3C14.6442 2.99998 16.0998 2.99997 17.239 3.15314C18.4114 3.31076 19.3604 3.64288 20.1088 4.39124C20.62 4.90252 20.9386 5.50974 21.1394 6.22218C21.1799 6.36575 21.067 6.50387 20.9179 6.5L18.394 6.50001C15.5574 6.50001 13.0571 8.74091 13.0571 11.75C13.0571 14.7591 15.5574 17 18.394 17L20.9179 17ZM5.75 7C5.33579 7 5 7.33579 5 7.75C5 8.16421 5.33579 8.5 5.75 8.5H9.75C10.1642 8.5 10.5 8.16421 10.5 7.75C10.5 7.33579 10.1642 7 9.75 7H5.75Z"
      />
    </svg>
  );
}

export function TrendingUpIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </>
  ));
}

export function CalendarIcon(props: IconProps) {
  return base(props, (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
    </>
  ));
}

export function ArrowRightIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ));
}

export function ChevronRightIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="m9 6 6 6-6 6" />
    </>
  ));
}

export function ChevronLeftIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="m15 6-6 6 6 6" />
    </>
  ));
}

export function ChevronUpIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="m6 15 6-6 6 6" />
    </>
  ));
}

export function ChevronDownIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ));
}

export function AlertIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4.5" />
      <path d="M12 17h.01" />
    </>
  ));
}

export function CheckIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="m4.5 12.5 5 5 10-11" />
    </>
  ));
}

export function GripIcon(props: IconProps) {
  return base(props, (
    <>
      <circle cx="9" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="18" r="1" />
    </>
  ));
}

export function EyeIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ));
}

export function XIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ));
}

export function PrinterIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M6 8V4h12v4" />
      <rect x="3" y="8" width="18" height="8" rx="1.5" />
      <path d="M6 13.5h12V20H6z" />
    </>
  ));
}

export function RefundIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v5h5" />
    </>
  ));
}

export function RefreshIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 6.2" />
      <path d="M20 4v7h-7" />
    </>
  ));
}

export function PauseIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </>
  ));
}

export function PlayIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="m8 5 11 7-11 7Z" />
    </>
  ));
}

export function ChartPieIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M21 12a9 9 0 1 1-9-9" />
      <path d="M21 12a9 9 0 0 0-9-9v9Z" />
    </>
  ));
}

export function TrashIcon(props: IconProps) {
  const { className = "", ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${className}`}
      aria-hidden="true"
      {...rest}
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 21H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12" />
      <path d="M22 2L13.8 10.2" />
      <path d="M13 6.17004V11H17.83" />
    </>
  ));
}

export function DownloadIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12" />
      <path d="M13 11L21.2 2.80005" />
      <path d="M21.9999 6.83V2H17.1699" />
    </>
  ));
}

export function HistoryIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M3 3V9H9" />
      <path d="M3.7 8C4.6 5.6 6.9 4 9.5 4C13 4 15.8 6.8 15.8 10.3C15.8 13.8 13 16.6 9.5 16.6C6.6 16.6 4.2 14.7 3.4 12" />
      <path d="M16.5 6.6C19 7.9 20.6 10.4 20.6 13.3C20.6 17.4 17.2 20.8 13.1 20.8C11.2 20.8 9.4 20.1 8 19" />
    </>
  ));
}

export function ReservationIcon(props: IconProps) {
  return base(props, (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
      <path d="m9 15.5 2 2 4-4" />
    </>
  ));
}

export function VoucherIcon(props: IconProps) {
  return base(props, (
    <>
      <path d="M3 5h18v5l-2 2 2 2v5H3v-5l2-2-2-2z" />
      <path d="M6.5 3.5h11M6.5 20.5h11" />
      <path d="M12 8.5c-1.4 0-2 .8-2 1.75 0 2.25 4 1.25 4 3.5 0 .95-.6 1.75-2 1.75s-2-.8-2-1.75" />
      <path d="M12 7v1.5M12 15.5V17" />
    </>
  ));
}

export const NAV_ICONS = {
  dashboard: DashboardIcon,
  pos: PosIcon,
  reservation: ReservationIcon,
  voucher: VoucherIcon,
  expenses: WalletIcon,
  purchases: PurchasesIcon,
  returns: ReturnsIcon,
  refund: RefundIcon,
  inventory: InventoryIcon,
  products: ProductsIcon,
  contacts: ContactsIcon,
  reports: ReportsIcon,
  analytics: ChartPieIcon,
  print: PrinterIcon,
  settings: SettingsIcon,
  users: UsersIcon,
} as const;

export type NavIconKey = keyof typeof NAV_ICONS;
