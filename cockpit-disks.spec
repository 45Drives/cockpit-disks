%define        __spec_install_post %{nil}
%define          debug_package %{nil}
%define        __os_install_post %{_dbpath}/brp-compress

Name:		cockpit-disks
Version:	0.1
Release:	1%{?dist}
Summary:	Interactive Storage Disk information module for Cockpit

Group:		Development/Tools
License:	GPL
URL:		https://github.com/45Drives/cockpit-disks
Source0:	%{name}-%{version}.tar.gz

BuildArch:	x86_64
BuildRoot:	%{_tmppath}/%{name}-%{version}-%{release}-root

Requires: cockpit
Requires: cockpit-ws
Requires: cockpit-bridge

%description
Interactive Storage Disk information module for Cockpit

%prep
%setup -q

%build
# empty

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/usr/share/cockpit/disks/

# in builddir
cp -a disks/ %{buildroot}/usr/share/cockpit/

%clean
rm -rf %{buildroot}

%files
%dir /usr/share/cockpit/zfs
%defattr(-,root,root,-)
/usr/share/cockpit/disks/*

%changelog
* Mon Oct 26 2020 Brett Kelly <bkelly@45drives.com> 0.1
- First build of 0.1
