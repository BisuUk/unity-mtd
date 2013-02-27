#pragma strict

var tips : String[];
var cycler : Transform;
var tipWidget : Transform;
var showTween : iTweenEvent;
var unshowTween : iTweenEvent;
var paragraph : UITextList;
var showTips : UICheckbox;

private var paragraphLabel : UILabel;

function Start()
{
   showTips.isChecked = true;
   paragraphLabel = paragraph.transform.Find("Label").GetComponent(UILabel);
   SetShowCycler(false);
}

function SetShowCycler(show : boolean)
{
   cycler.gameObject.SetActive(show);
}

function ShowTip(str : String)
{
   if (str == "")
   {
      tipWidget.gameObject.SetActive(false);
      return;
   }

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

   var st : String[] = str.Split("|"[0]);
   for (var s : String in st)
      paragraph.Add(s);

   var tw : TypewriterTextFX = paragraphLabel.gameObject.GetComponent(TypewriterTextFX);
   if (tw)
      Destroy(tw);
   paragraphLabel.gameObject.AddComponent(TypewriterTextFX);
}

function ShowTip(index : int)
{
   if (index < 0 || index >= tips.Length)
   {
      tipWidget.gameObject.SetActive(false);
      return;
   }

   if (showTips.isChecked)
      ShowTip(tips[index]);
}

function OnClose()
{
   tipWidget.gameObject.SetActive(false);
}

