#pragma strict

var tips : String[];
var cycler : Transform;

var tipWidget : Transform;
var showTween : iTweenEvent;
var unshowTween : iTweenEvent;
var paragraph : UITextList;
var showTips : UICheckbox;

function Start()
{
   showTips.isChecked = true;
   SetShowCycler(false);
}

function SetShowCycler(show : boolean)
{
   cycler.gameObject.SetActive(show);
}

function ShowTip(index : int)
{
   if (index < 0 || index >= tips.Length)
   {
      tipWidget.gameObject.SetActive(false);
      return;
   }

   if (showTips.isChecked)
   {
      if (tipWidget.gameObject.activeInHierarchy == false)
      {
         tipWidget.gameObject.SetActive(true);
         showTween.Play();
      }
      else
      {
         unshowTween.Play();
      }
      paragraph.Clear();


      var st : String[] = tips[index].Split("|"[0]);
      for (var s : String in st)
         paragraph.Add(s);

   }
}

function OnClose()
{
   tipWidget.gameObject.SetActive(false);
}

