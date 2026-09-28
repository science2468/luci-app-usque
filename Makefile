include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for usque (Unofficial Cloudflare WARP MASQUE client)
LUCI_DEPENDS:=+luci-base +usque +rpcd
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-usque
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature