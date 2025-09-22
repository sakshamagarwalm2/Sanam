!include LogicLib.nsh

# Custom installation pages
PageEx directory
  PageExEnd
PageEx instfiles
  PageExEnd

# Custom uninstaller
Section "Uninstall"
  Delete "$DESKTOP\Tinkle.lnk"
  Delete "$SMPROGRAMS\Tinkle\Tinkle.lnk"
  RMDir "$SMPROGRAMS\Tinkle"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Tinkle"
SectionEnd